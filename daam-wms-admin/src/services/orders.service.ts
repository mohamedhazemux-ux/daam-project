import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import type { ListQuery, ListResult, Order } from '@/types'

export const ordersService = {
  async list(q: ListQuery): Promise<ListResult<Order>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const status = q.status as string
    const ship = q.ship as string
    const merchant = q.merchant as string
    const rows = db.orders.filter(o =>
      (!t || o.id.includes(t) || o.m.includes(t) || o.cust.includes(t)) &&
      (!status || o.status === status) && (!ship || o.ship === ship) && (!merchant || o.m === merchant))
    return paginate(rows, q)
  },
  async setStatus(ids: string[], status: Order['status']) {
    await delay(400)
    db.orders.forEach(o => { if (ids.includes(o.id)) o.status = status })
    audit('تحديث حالة الطلب ' + ids.join('، ') + ' إلى ' + status, 'طلبات', 'تعديل')
  },
  async assignPicker(id: string, picker: string) {
    await delay(300)
    audit('إسناد الطلب ' + id + ' إلى المنتقي ' + picker, 'طلبات')
  },
  async printPackingSlip(id: string) {
    await delay(200)
    const o = db.orders.find(x => x.id === id)
    if (!o) throw new Error('الطلب غير موجود')
    audit('طباعة قائمة التعبئة للطلب ' + id, 'طلبات')
    return 'packing-slip-' + id + '.pdf'
  },
  async printLabel(id: string) {
    await delay(200)
    const o = db.orders.find(x => x.id === id)
    if (!o) throw new Error('الطلب غير موجود')
    if (o.ship === 'ذاتي') throw new Error('إدارة بوليصة الشحن تتم بواسطة التاجر للطلبات ذاتية الشحن')
    audit('طباعة بوليصة الشحن للطلب ' + id, 'طلبات')
    return 'shipping-label-' + id + '.pdf'
  },
}
