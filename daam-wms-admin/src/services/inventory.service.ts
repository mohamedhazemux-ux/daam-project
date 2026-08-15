import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { storageStatus } from './merchant.service'
import type { ListQuery, ListResult, Merchant, StockLevel, StockRequest } from '@/types'

export const inventoryService = {
  async requests(q: ListQuery): Promise<ListResult<StockRequest>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const type = q.type as string
    const status = q.status as string
    const rows = db.stockRequests.filter(r =>
      (!t || r.id.includes(t) || r.m.includes(t)) && (!type || r.type === type) && (!status || r.status === status))
    return paginate(rows, q)
  },
  async approveRequest(id: string) {
    await delay(350)
    const r = db.stockRequests.find(x => x.id === id)
    if (!r) throw new Error('الطلب غير موجود')
    r.status = 'معتمد'
    const lv = db.stockLevels.find(s => s.p === r.p)
    if (lv) lv.avail = r.type === 'إضافة' ? lv.avail + r.qty : Math.max(0, lv.avail - r.qty)
    audit('اعتماد طلب المخزون ' + id, 'مخزون', 'اعتماد')
  },
  async rejectRequest(id: string, reason: string) {
    await delay(350)
    const r = db.stockRequests.find(x => x.id === id)
    if (!r) throw new Error('الطلب غير موجود')
    r.status = 'مرفوض'
    audit('رفض طلب المخزون ' + id + ' — السبب: ' + reason, 'مخزون', 'رفض')
  },
  async levels(q: ListQuery): Promise<ListResult<StockLevel>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const wh = q.wh as string
    const rows = db.stockLevels.filter(s => (!t || s.p.includes(t) || s.sku.includes(t)) && (!wh || s.wh === wh))
    return paginate(rows, q)
  },
  async options() {
    await delay(100)
    return { products: db.stockLevels.map(s => s.p), warehouses: db.warehouses }
  },
  async adjust(p: string, wh: string, type: string, qty: number, reason: string) {
    await delay(350)
    const s = db.stockLevels.find(x => x.p === p)
    if (s) s.avail = type === 'زيادة' ? s.avail + qty : Math.max(0, s.avail - qty)
    audit('تسوية مخزون: ' + p + ' (' + wh + ' — ' + type + ' ' + qty + ') — السبب: ' + reason, 'مخزون', 'تعديل')
  },
  async transfer(p: string, from: string, to: string, qty: number) {
    await delay(350)
    audit('نقل مخزون: ' + p + ' من ' + from + ' إلى ' + to + ' (' + qty + ')', 'مخزون', 'تعديل')
  },
  async count(p: string, wh: string, actual: number) {
    await delay(350)
    const s = db.stockLevels.find(x => x.p === p)
    const rec = s?.avail ?? 0
    if (s) s.avail = actual
    audit('جرد مخزون: ' + p + ' (' + wh + ') — فعلي: ' + actual + ' / مسجل: ' + rec, 'مخزون')
    return actual - rec
  },
  async usage(q: ListQuery): Promise<ListResult<Merchant & { pct: number; st: string }>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const f = q.st as string
    const rows = db.merchants.filter(m => m.limit > 0)
      .map(m => ({ ...m, pct: Math.round((m.used / m.limit) * 100), st: storageStatus(m.used, m.limit) }))
      .filter(r => (!t || r.store.includes(t) || r.email.includes(t)) && (!f || r.st === f))
      .sort((a, b) => b.pct - a.pct)
    return paginate(rows, q)
  },
}
