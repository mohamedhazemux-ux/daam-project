import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { merchantOrders } from './merchant-orders.service'
import { todayISO } from '@/lib/utils'
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
  async setStatus(ids: string[], status: Order['status'], reason?: string) {
    await delay(300)
    db.orders.forEach(o => {
      if (ids.includes(o.id)) {
        o.status = status
        if (status === 'مرفوض' && reason) o.rejectionReason = reason
        if (status === 'ملغي' && reason) o.cancellationReason = reason
        const mo = merchantOrders.find(x => x.ref === o.id)
        if (mo) {
          mo.status = status as any
          const noteSuffix = reason ? ` — السبب: ${reason}` : ''
          mo.log.unshift(`تحديث حالة الطلب إلى "${status}" بواسطة إدارة المنصة${noteSuffix} — ${todayISO()}`)
        }
      }
    })
    audit('تحديث حالة الطلب ' + ids.join('، ') + ' إلى ' + status + (reason ? ' — السبب: ' + reason : ''), 'طلبات', 'تعديل')
  },
  async acceptOrder(id: string) {
    return this.setStatus([id], 'قيد التنفيذ')
  },
  async rejectOrder(id: string, reason: string) {
    const trimmed = reason.trim()
    if (!trimmed || trimmed.length < 5 || trimmed.length > 500) {
      throw new Error('سبب الرفض إلزامي ويجب أن يكون بين 5 و 500 حرف')
    }
    return this.setStatus([id], 'مرفوض', trimmed)
  },
  async packOrder(id: string) {
    return this.setStatus([id], 'قيد التغليف')
  },
  async pickupOrder(id: string) {
    return this.setStatus([id], 'جاهز للاستلام')
  },
  async startDelivery(id: string) {
    return this.setStatus([id], 'قيد التوصيل')
  },
  async completeOrder(id: string) {
    return this.setStatus([id], 'مكتمل')
  },
  async cancelOrder(id: string, reason: string) {
    const trimmed = reason.trim()
    if (!trimmed || trimmed.length < 5 || trimmed.length > 500) {
      throw new Error('سبب الإلغاء إلزامي ويجب أن يكون بين 5 و 500 حرف')
    }
    return this.setStatus([id], 'ملغي', trimmed)
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

