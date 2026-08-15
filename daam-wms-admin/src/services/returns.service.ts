import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import type { ListQuery, ListResult, ReturnRequest } from '@/types'

export const returnsService = {
  async list(q: ListQuery): Promise<ListResult<ReturnRequest>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const tab = q.tab as string
    const type = q.type as string
    const rows = db.returns
      .filter(r => (tab === 'all' ? true : r.status === 'معلق'))
      .filter(r => (!t || [r.ref, r.order, r.m, r.email, r.cust].some(x => x.toLowerCase().includes(t))) && (!type || r.type === type))
    return paginate(rows, q)
  },
  async approve(ref: string) {
    await delay(350)
    const r = db.returns.find(x => x.ref === ref)
    if (!r) throw new Error('مرجع الإرجاع غير موجود')
    r.status = 'معتمد'
    audit('اعتماد طلب الإرجاع ' + ref + ' (' + r.type + ') — توليد بوليصة إرجاع وإرسال التعليمات للتاجر والعميل', 'مرتجعات', 'اعتماد')
  },
  async reject(ref: string, reason: string) {
    await delay(350)
    const r = db.returns.find(x => x.ref === ref)
    if (!r) throw new Error('مرجع الإرجاع غير موجود')
    r.status = 'مرفوض'
    r.reason = reason
    audit('رفض طلب الإرجاع ' + ref + ' — السبب: ' + reason, 'مرتجعات', 'رفض')
  },
  async receive(ref: string) {
    await delay(350)
    const r = db.returns.find(x => x.ref === ref)
    if (!r) throw new Error('مرجع الإرجاع غير موجود')
    if (r.status !== 'في الطريق') throw new Error('يجب أن يكون طلب الإرجاع بحالة "في الطريق" لاستلام القطع')
    r.status = 'مستلم'
    audit('استلام مرتجعات ' + ref + ' (' + r.count + ' قطعة)', 'مرتجعات')
  },
  async inspect(ref: string, results: { condition: string }[]) {
    await delay(400)
    const r = db.returns.find(x => x.ref === ref)
    if (!r) throw new Error('مرجع الإرجاع غير موجود')
    if (r.status !== 'مستلم') throw new Error('يجب أن يكون طلب الإرجاع بحالة "مستلم" لفحص القطع')
    r.status = 'تم الفحص'
    const toStock = results.filter(x => x.condition === 'غير مفتوح' || x.condition === 'مفتوح لكن غير مستخدم').length
    const toMerchant = results.filter(x => x.condition === 'مستخدم').length
    const dispose = results.filter(x => x.condition === 'تالف').length
    audit('فحص مرتجعات ' + ref + ' — إجمالي: ' + results.length + ' | للمخزون: ' + toStock + ' | للتاجر: ' + toMerchant + ' | إتلاف: ' + dispose, 'مرتجعات')
    return { toStock, toMerchant, dispose }
  },
  async refund(ref: string, method: string, amount: number) {
    await delay(400)
    const r = db.returns.find(x => x.ref === ref)
    if (!r) throw new Error('مرجع الإرجاع غير موجود')
    if (r.status !== 'تم الفحص') throw new Error('يجب أن يكون طلب الإرجاع بحالة "تم الفحص" لمعالجة الاسترداد')
    r.status = 'تم الاسترداد'
    if (method === 'رصيد المحفظة') {
      const w = db.wallets.find(x => x.m === r.m)
      if (w) w.bal += amount
    }
    const txRef = 'RF-' + ref.slice(-4)
    audit('استرداد ' + ref + ' عبر ' + method + ' بمبلغ ' + amount + ' — مرجع العملية: ' + txRef, 'مرتجعات', 'اعتماد')
    return txRef
  },
}
