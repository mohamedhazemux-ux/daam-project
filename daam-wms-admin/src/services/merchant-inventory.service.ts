import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { storageStatus } from './merchant.service'
import { merchantProducts } from './merchant-products.service'
import type { ListQuery, ListResult, StockRequest } from '@/types'
export interface StockLevelRow { sku: string; p: string; avail: number; res: number; total: number }
let srSeq = 500
const reqNotes: Record<string, string> = {}
export const merchantInventoryService = {
  async levels(q: ListQuery & { store: string }): Promise<ListResult<StockLevelRow>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const op = q.op as string
    const val = +(q.val ?? 0)
    let rows = merchantProducts.filter(p => p.m === q.store).map(p => { const res = Math.max(0, Math.round(p.sold / 10)); return { sku: p.sku, p: p.name, avail: p.qty, res, total: p.qty + res } })
    if (t) rows = rows.filter(r => r.p.toLowerCase().includes(t) || r.sku.toLowerCase().includes(t))
    if (op === 'greater') rows = rows.filter(r => r.avail > val)
    if (op === 'less') rows = rows.filter(r => r.avail < val)
    if (op === 'equal') rows = rows.filter(r => r.avail === val)
    return paginate(rows, q)
  },
  async storage(store: string) {
    await delay(150)
    const m = db.merchants.find(x => x.store === store)
    if (!m) throw new Error('التاجر غير موجود')
    const pct = m.limit ? Math.round((m.used / m.limit) * 100) : 0
    return { limit: m.limit, used: m.used, unit: m.unit, pct, status: storageStatus(m.used, m.limit) }
  },
  async submitRequest(store: string, kind: 'إضافة' | 'سحب', input: { product: string; qty: number; notes: string; attachment?: string }) {
    await delay(400)
    const id = 'SR-' + ++srSeq
    db.stockRequests.unshift({ id, m: store, p: input.product, wh: 'المستودع الرئيسي', qty: input.qty, type: kind, date: new Date().toISOString().slice(0, 10), status: 'معلق', notes: input.notes, attachment: input.attachment })
    db.approvals.unshift({ id: 'APR-' + (300 + db.approvals.length + 1), type: kind === 'إضافة' ? 'إضافة مخزون' : 'سحب مخزون', who: store, title: 'طلب ' + kind + ' مخزون: ' + input.product + ' × ' + input.qty, urgency: 'عادي', date: new Date().toISOString().slice(0, 10), days: 0, qty: input.qty, sourceRef: id })
    reqNotes[id] = input.notes
    audit('طلب ' + kind + ' مخزون: ' + input.product + ' × ' + input.qty + ' (' + id + ')', 'مخزون التاجر', 'إنشاء')
    return id
  },
  async requests(q: ListQuery & { store: string }): Promise<ListResult<StockRequest>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const type = q.type as string
    const status = q.status as string
    const rows = db.stockRequests.filter(r => r.m === q.store && (!t || r.id.toLowerCase().includes(t) || r.p.toLowerCase().includes(t)) && (!type || r.type === type) && (!status || r.status === status))
    return paginate(rows, q)
  },
  notesOf: (id: string) => reqNotes[id] ?? '',
}
