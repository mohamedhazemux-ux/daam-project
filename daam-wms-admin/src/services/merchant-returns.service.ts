import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { merchantOrders } from './merchant-orders.service'
import { todayISO } from '@/lib/utils'
import type { ListQuery, ListResult } from '@/types'
export interface ReturnItem { name: string; ref: string; qty: number; reason: string; condition: string; images: string[] }
export interface MerchantReturn { ref: string; m: string; order: string; cust: string; phone: string; deliveredAt: string; items: ReturnItem[]; totalItems: number; type: string; refundMethod: string; notes: string; attachments: string[]; status: string; createdAt: string; timeline: string[] }
export const RETURN_REASONS = ['منتج تالف', 'منتج خاطئ', 'مشكلة جودة', 'تغيير رأي العميل', 'منتج منتهي الصلاحية', 'أخرى']
export const RETURN_CONDITIONS = ['غير مفتوح', 'مفتوح لكن غير مستخدم', 'مستخدم', 'تالف']
const seed = (): MerchantReturn[] => {
  const o = merchantOrders.find(x => x.status === 'مكتمل')
  if (!o) return []
  const letter = (o.m.trim()[0] ?? 'M').toUpperCase()
  return [
    { ref: 'RET-' + letter + '-001', m: o.m, order: o.ref, cust: o.cust, phone: '0512345678', deliveredAt: o.date, items: [{ name: o.items[0]?.name ?? 'منتج', ref: 'PRD-001', qty: 1, reason: 'منتج تالف', condition: 'تالف', images: ['damage-1.jpg'] }], totalItems: 1, type: 'إتلاف', refundMethod: 'رصيد المحفظة', notes: 'تم تسجيل التلف بالصور ويحتاج الطلب إلى مراجعة الجودة.', attachments: ['damage-1.jpg', 'return-report.pdf'], status: 'في الطريق', createdAt: o.date, timeline: ['معلق — ' + o.date, 'معتمد بواسطة منى المطيري — ' + o.date, 'في الطريق — رقم التتبع TRK-778899 — ' + o.date] },
    { ref: 'RET-' + letter + '-002', m: o.m, order: o.ref, cust: o.cust, phone: '0512345678', deliveredAt: o.date, items: [{ name: o.items[0]?.name ?? 'منتج', ref: 'PRD-002', qty: 1, reason: 'مشكلة جودة', condition: 'مفتوح لكن غير مستخدم', images: [] }], totalItems: 1, type: 'إرجاع للمخزون', refundMethod: 'تحويل بنكي', notes: 'تم فتح العبوة للفحص فقط، والمنتج بحالة مناسبة لإعادة التخزين.', attachments: ['inspection.xlsx'], status: 'معلق', createdAt: o.date, timeline: ['معلق — ' + o.date] },
    { ref: 'RET-' + letter + '-003', m: o.m, order: o.ref, cust: 'خالد المطيري', phone: '0555888999', deliveredAt: '2026-01-20', items: [{ name: 'بن محمص كولومبي 500جم', ref: 'PRD-002', qty: 2, reason: 'منتج خاطئ', condition: 'غير مفتوح', images: [] }], totalItems: 2, type: 'إرجاع للمخزون', refundMethod: 'رصيد المحفظة', notes: 'تم إرجاع المنتجات واعتمادها واستلامها في المستودع.', attachments: ['return_goods_receipt.pdf'], status: 'تم الاسترداد', createdAt: '2026-01-22', timeline: ['معلق — 2026-01-22', 'معتمد — 2026-01-23', 'مستلم — 2026-01-24', 'تم الاسترداد — 2026-01-25'] },
    { ref: 'RET-' + letter + '-004', m: o.m, order: o.ref, cust: 'نورة الشمري', phone: '0533221144', deliveredAt: '2026-01-18', items: [{ name: 'أكياس قهوة ورقية (50 قطعة)', ref: 'PRD-003', qty: 1, reason: 'تغيير رأي العميل', condition: 'مستخدم', images: [] }], totalItems: 1, type: 'إرجاع للتاجر', refundMethod: 'تحويل بنكي', notes: 'المنتج مستخدم جزئياً وتم تحويله للتاجر للفحص.', attachments: [], status: 'مستلم', createdAt: '2026-01-20', timeline: ['معلق — 2026-01-20', 'معتمد — 2026-01-21', 'مستلم — 2026-01-22'] },
  ]
}
export const merchantReturns: MerchantReturn[] = seed()
let seq = 4
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
  async create(store: string, email: string, input: { orderRef: string; cust: string; phone: string; deliveredAt: string; items: ReturnItem[]; type: string; refundMethod: string; notes: string; attachments?: string[] }) {
    await delay(500)
    const letter = (store.trim()[0] ?? 'M').toUpperCase()
    const ref = 'RET-' + letter + '-' + String(++seq).padStart(3, '0')
    const totalItems = input.items.reduce((s, i) => s + i.qty, 0)
    const attachments = input.attachments ?? []
    merchantReturns.unshift({ ref, m: store, order: input.orderRef, cust: input.cust, phone: input.phone, deliveredAt: input.deliveredAt, items: input.items, totalItems, type: input.type, refundMethod: input.refundMethod, notes: input.notes, attachments, status: 'معلق', createdAt: todayISO(), timeline: ['معلق — ' + todayISO()] })
    db.returns.unshift({ ref, m: store, email, order: input.orderRef, cust: input.cust, count: totalItems, type: input.type, date: todayISO(), status: 'معلق', reason: '', notes: input.notes, attachment: attachments.length ? attachments.join(', ') : undefined } as (typeof db.returns)[0])
    db.approvals.unshift({ id: 'APR-' + (400 + db.approvals.length + 1), type: 'طلب إرجاع', who: store, title: 'طلب إرجاع ' + ref + ' للطلب ' + input.orderRef + ' (' + totalItems + ' صنف)', urgency: 'عادي', date: todayISO(), days: 0, sourceRef: ref })
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
    db.approvals = db.approvals.filter(a => a.sourceRef !== ref)
    audit('إلغاء طلب الإرجاع ' + ref + ' بواسطة التاجر', 'مرتجعات التاجر', 'تعديل')
  },
}
