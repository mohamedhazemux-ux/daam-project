import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { merchantOrders } from './merchant-orders.service'
import { todayISO } from '@/lib/utils'
import type { ListQuery, ListResult } from '@/types'
export interface ReturnItem { name: string; ref: string; qty: number; reason: string; condition: string; images: string[] }
export interface MerchantReturn { ref: string; m: string; order: string; cust: string; phone: string; deliveredAt: string; items: ReturnItem[]; totalItems: number; type: string; refundMethod: string; notes: string; status: string; createdAt: string; timeline: string[] }
export const RETURN_REASONS = ['منتج تالف', 'منتج خاطئ', 'مشكلة جودة', 'تغيير رأي العميل', 'منتج منتهي الصلاحية', 'أخرى']
export const RETURN_CONDITIONS = ['غير مفتوح', 'مفتوح لكن غير مستخدم', 'مستخدم', 'تالف']
const seed = (): MerchantReturn[] => {
  const o = merchantOrders.find(x => x.status === 'مكتمل')
  if (!o) return []
  const letter = (o.m.trim()[0] ?? 'M').toUpperCase()
  return [{ ref: 'RET-' + letter + '-001', m: o.m, order: o.ref, cust: o.cust, phone: '0512345678', deliveredAt: o.date, items: [{ name: o.items[0]?.name ?? 'منتج', ref: 'PRD-001', qty: 1, reason: 'منتج تالف', condition: 'تالف', images: ['damage-1.jpg'] }], totalItems: 1, type: 'إتلاف', refundMethod: 'رصيد المحفظة', notes: '', status: 'في الطريق', createdAt: o.date, timeline: ['معلق — ' + o.date, 'معتمد بواسطة منى المطيري — ' + o.date, 'في الطريق — رقم التتبع TRK-778899 — ' + o.date] }]
}
export const merchantReturns: MerchantReturn[] = seed()
let seq = 1
export const merchantReturnsService = {
  async deliveredOrders(store: string) {
    await delay(150)
    return merchantOrders.filter(o => o.m === store && o.status === 'مكتمل')
  },
  async list(q: ListQuery & { store: string }): Promise<ListResult<MerchantReturn>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const status = q.status as string
    const type = q.type as string
    const from = q.from as string
    const to = q.to as string
    const rows = merchantReturns.filter(r => r.m === q.store &&
      (!t || r.ref.toLowerCase().includes(t) || r.order.toLowerCase().includes(t) || r.cust.toLowerCase().includes(t)) &&
      (!status || r.status === status) && (!type || r.type === type) &&
      (!from || r.createdAt >= from) && (!to || r.createdAt <= to))
    return paginate(rows, q)
  },
  async create(store: string, email: string, input: { orderRef: string; cust: string; phone: string; deliveredAt: string; items: ReturnItem[]; type: string; refundMethod: string; notes: string }) {
    await delay(500)
    const letter = (store.trim()[0] ?? 'M').toUpperCase()
    const ref = 'RET-' + letter + '-' + String(++seq).padStart(3, '0')
    const totalItems = input.items.reduce((s, i) => s + i.qty, 0)
    merchantReturns.unshift({ ref, m: store, order: input.orderRef, cust: input.cust, phone: input.phone, deliveredAt: input.deliveredAt, items: input.items, totalItems, type: input.type, refundMethod: input.refundMethod, notes: input.notes, status: 'معلق', createdAt: todayISO(), timeline: ['معلق — ' + todayISO()] })
    db.returns.unshift({ ref, m: store, email, order: input.orderRef, cust: input.cust, count: totalItems, type: input.type, date: todayISO(), status: 'معلق', reason: '' } as (typeof db.returns)[0])
    db.approvals.unshift({ id: 'APR-' + (400 + db.approvals.length + 1), type: 'طلب إرجاع', who: store, title: 'طلب إرجاع ' + ref + ' للطلب ' + input.orderRef + ' (' + totalItems + ' صنف)', urgency: 'عادي', date: todayISO(), days: 0 })
    audit('إنشاء طلب إرجاع ' + ref + ' للطلب ' + input.orderRef + ' — الأصناف: ' + totalItems + ' — النوع: ' + input.type, 'مرتجعات التاجر', 'إنشاء')
    return ref
  },
  async details(ref: string) {
    await delay(200)
    const r = merchantReturns.find(x => x.ref === ref)
    if (!r) throw new Error('طلب الإرجاع غير موجود')
    return r
  },
  async cancel(ref: string) {
    await delay(300)
    const r = merchantReturns.find(x => x.ref === ref)
    if (!r) throw new Error('طلب الإرجاع غير موجود')
    if (r.status !== 'معلق') throw new Error('يمكن إلغاء طلبات الإرجاع المعلقة فقط')
    r.status = 'ملغي'
    r.timeline.unshift('ملغي بواسطة التاجر — ' + todayISO())
    const adm = db.returns.find(x => x.ref === ref)
    if (adm) adm.status = 'ملغي'
    audit('إلغاء طلب الإرجاع ' + ref + ' بواسطة التاجر', 'مرتجعات التاجر', 'تعديل')
  },
}
