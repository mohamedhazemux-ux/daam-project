import { db } from '@/mocks/db'
import { delay } from './http'
import { audit } from './audit.service'
import { merchantOrders } from './merchant-orders.service'
import { merchantProducts } from './merchant-products.service'
import { merchantReturns } from './merchant-returns.service'
import { TXS } from './merchant-finance.service'
export const merchantReportsService = {
  async orders(store: string, from: string, to: string, statuses: string[]) {
    await delay(300)
    const rows = merchantOrders.filter(o => o.m === store && (!from || o.date >= from) && (!to || o.date <= to) && (statuses.length === 0 || statuses.includes(o.status)))
    const items = rows.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0)
    const revenue = rows.reduce((s, o) => s + o.total, 0)
    audit('توليد تقرير الطلبات (' + (from || '—') + ' → ' + (to || '—') + ')', 'تقارير التاجر')
    return {
      summary: { count: rows.length, items, revenue, avg: rows.length ? Math.round(revenue / rows.length) : 0, byStatus: ['معلق', 'قيد المعالجة', 'مكتمل', 'ملغي'].map(s => [s, rows.filter(o => o.status === s).length] as [string, number]), byShip: [['شحن المنصة', rows.filter(o => o.shipResp === 'منصة').length], ['الشحن الذاتي', rows.filter(o => o.shipResp === 'ذاتي').length]] as [string, number][] },
      detail: rows,
    }
  },
  async inventory(store: string, type: string, from?: string, to?: string) {
    await delay(300)
    const prods = merchantProducts.filter(p => p.m === store)
    const wh = 'المستودع الرئيسي'
    audit('توليد تقرير المخزون — النوع: ' + type, 'تقارير التاجر')
    if (type === 'المستويات الحالية') return { rows: prods.map(p => ({ a: p.name, b: p.sku, c: wh, d: p.qty, e: Math.round(p.sold / 10), f: p.qty === 0 ? 'نفد' : p.qty < 25 ? 'منخفض' : 'اعتيادي' })) }
    if (type === 'سجل حركات المخزون') {
      const reqs = db.stockRequests.filter(r => r.m === store && (!from || r.date >= from) && (!to || r.date <= to))
      return { rows: reqs.map(r => ({ a: r.p, b: r.id, c: r.type, d: r.qty, e: r.wh, f: r.date })) }
    }
    if (type === 'تنبيه المخزون المنخفض') return { rows: prods.filter(p => p.qty > 0 && p.qty < 25).map(p => ({ a: p.name, b: p.sku, c: wh, d: p.qty, e: 45 - p.qty, f: 'اقتراح إعادة طلب' })) }
    return { rows: prods.filter(p => p.qty === 0).map(p => ({ a: p.name, b: p.sku, c: wh, d: '2026-01-05', e: 10, f: 'أيام النفاد' })) }
  },
  async returns(store: string, from: string, to: string) {
    await delay(300)
    const rows = merchantReturns.filter(r => r.m === store && (!from || r.createdAt >= from) && (!to || r.createdAt <= to))
    const delivered = merchantOrders.filter(o => o.m === store && o.status === 'مكتمل').length || 1
    audit('توليد تقرير المرتجعات (' + (from || '—') + ' → ' + (to || '—') + ')', 'تقارير التاجر')
    return {
      summary: { count: rows.length, items: rows.reduce((s, r) => s + r.totalItems, 0), rate: Math.round((rows.length / delivered) * 100), refunds: rows.length * 180, byStatus: ['معلق', 'معتمد', 'في الطريق', 'مستلم', 'تم الفحص', 'تم الاسترداد', 'ملغي'].map(s => [s, rows.filter(r => r.status === s).length] as [string, number]), byReason: [['منتج تالف', rows.filter(r => r.items.some(i => i.reason === 'منتج تالف')).length], ['منتج خاطئ', rows.filter(r => r.items.some(i => i.reason === 'منتج خاطئ')).length], ['أخرى', rows.filter(r => r.items.some(i => !['منتج تالف', 'منتج خاطئ'].includes(i.reason))).length]] as [string, number][] },
      detail: rows,
    }
  },
  async financial(store: string, from: string, to: string, types: string[]) {
    await delay(300)
    const rows = TXS.filter(x => x.m === store && (!from || x.date >= from) && (!to || x.date <= to) && (types.length === 0 || types.includes(x.type)))
    const sum = (t: string) => rows.filter(x => x.type === t).reduce((s, x) => s + x.amount, 0)
    const opening = rows.length ? rows[rows.length - 1].running : 0
    const closing = rows.length ? rows[0].running : 0
    audit('توليد التقرير المالي (' + (from || '—') + ' → ' + (to || '—') + ')', 'تقارير التاجر')
    return { summary: { opening, credits: sum('إيداع'), debits: sum('خصم'), refunds: sum('استرداد'), withdrawals: sum('سحب'), adjustments: sum('تعديل'), closing, net: closing - opening }, detail: rows }
  },
}
