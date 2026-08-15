import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { todayISO } from '@/lib/utils'
import { merchantSettingsService } from './merchant-settings.service'
import type { ListQuery, ListResult } from '@/types'
export interface MerchantProduct { ref: string; m: string; name: string; sku: string; desc: string; qty: number; price: number; status: 'نشط' | 'معطل'; sold: number; created: string; log: string[] }
const seed = (): MerchantProduct[] => {
  const out: MerchantProduct[] = []
  const names: [string, number][] = [['قهوة عربية مختصة 1كجم', 180], ['بن محمص كولومبي 500جم', 95], ['أكياس قهوة ورقية (50 قطعة)', 40], ['منظف أرضيات معطر 3لتر', 35], ['معقم أسطح 1لتر', 22], ['فوط مايكروفايبر (10 قطع)', 30], ['بن أخضر إثيوبي 5كجم', 260], ['أكياس تغليف حرارية (100)', 55], ['معطر جو فندقي 500مل', 28]]
  db.merchants.slice(0, 3).forEach((m, mi) => {
    names.slice(mi * 3, mi * 3 + 3).forEach(([n, pr], i) => {
      out.push({ ref: 'PRD-' + String(out.length + 1).padStart(3, '0'), m: m.store, name: n, sku: 'SKU-' + (1000 + out.length * 7), desc: 'منتج أساسي ضمن كتالوج التاجر', qty: i === 1 && mi === 0 ? 0 : i === 2 ? 18 : 60 + i * 25, price: pr, status: i === 2 && mi === 1 ? 'معطل' : 'نشط', sold: 130 - i * 35 + mi * 15, created: '2025-11-0' + (i + 1), log: ['إنشاء المنتج بواسطة التاجر'] })
    })
  })
  return out
}
export const merchantProducts: MerchantProduct[] = seed()
let seq = 200
export const merchantProductsService = {
  async list(q: ListQuery & { store: string }): Promise<ListResult<MerchantProduct>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const status = q.status as string
    const rows = merchantProducts.filter(p => p.m === q.store && (!t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)) && (!status || p.status === status))
    return paginate(rows, q)
  },
  async create(store: string, input: { name: string; sku: string; desc: string; qty: number; price: number }) {
    await delay(400)
    if (merchantProducts.some(p => p.sku === input.sku)) throw new Error('رمز المنتج موجود مسبقاً ، يرجى اختيار رمز آخر')
    const ref = 'PRD-' + String(++seq).padStart(3, '0')
    merchantProducts.unshift({ ref, m: store, name: input.name, sku: input.sku, desc: input.desc, qty: input.qty, price: input.price, status: 'نشط', sold: 0, created: todayISO(), log: ['إضافة المنتج بواسطة التاجر — ' + todayISO()] })
    audit('إضافة منتج: ' + input.name + ' (' + input.sku + ')', 'منتجات التاجر', 'إنشاء')
    return ref
  },
  async generate(store: string, count: number) {
    await delay(500)
    for (let i = 0; i < count; i++) {
      const ref = 'PRD-' + String(++seq).padStart(3, '0')
      merchantProducts.unshift({ ref, m: store, name: 'منتج الرفع الجماعي ' + (i + 1), sku: 'BLK-' + seq * 3, desc: 'منتج مولّد من ملف الرفع الجماعي', qty: 50, price: 45, status: 'نشط', sold: 0, created: todayISO(), log: ['توليد المنتج من الملف — ' + todayISO()] })
    }
    audit('توليد ' + count + ' منتجات من ملف الرفع الجماعي', 'منتجات التاجر', 'إنشاء')
  },
  async update(ref: string, patch: Partial<MerchantProduct>) {
    await delay(300)
    const p = merchantProducts.find(x => x.ref === ref)
    if (!p) throw new Error('المنتج غير موجود')
    Object.assign(p, patch)
    p.log.unshift('تعديل بيانات المنتج — ' + todayISO())
    audit('تعديل منتج: ' + p.name + ' (' + p.sku + ')', 'منتجات التاجر', 'تعديل')
  },
  async toggle(ref: string) {
    await delay(250)
    const p = merchantProducts.find(x => x.ref === ref)
    if (!p) throw new Error('المنتج غير موجود')
    p.status = p.status === 'نشط' ? 'معطل' : 'نشط'
    p.log.unshift('تغيير الحالة إلى ' + p.status + ' — ' + todayISO())
    audit('تغيير حالة منتج: ' + p.name + ' (' + p.sku + ') إلى ' + p.status, 'منتجات التاجر')
  },
  async remove(ref: string) {
    await delay(300)
    const i = merchantProducts.findIndex(x => x.ref === ref)
    if (i === -1) throw new Error('المنتج غير موجود')
    const p = merchantProducts[i]
    merchantProducts.splice(i, 1)
    audit('حذف منتج: ' + p.name + ' (' + p.sku + ')', 'منتجات التاجر', 'حذف')
  },
  async analytics(store: string) {
    await delay(200)
    const prods = merchantProducts.filter(p => p.m === store)
    const th = merchantSettingsService.loadSync(store).lowStockThreshold
    const orders = db.orders.filter(o => o.m === store)
    const reqs = db.stockRequests.filter(r => r.m === store)
    const rets = db.returns.filter(r => r.m === store)
    const wallet = db.wallets.find(w => w.m === store)
    const by = (s: string) => orders.filter(o => o.status === s).length
    return {
      totalProducts: prods.length,
      activeOrders: orders.length - by('مكتمل') - by('ملغي'),
      completedOrders: by('مكتمل'),
      pendingStock: reqs.filter(r => r.status === 'معلق').length,
      pendingReturns: rets.filter(r => r.status === 'معلق').length,
      walletBalance: wallet?.bal ?? 0,
      lowStock: prods.filter(p => p.qty > 0 && p.qty < th).length,
      outStock: prods.filter(p => p.qty === 0).length,
      trend: [4, 6, 5, 8, 7, 9, 6, 8, 10, 7, 9, 11, 8, 10, 9, 12, 10, 8, 11, 13, 9, 12, 14, 10, 12, 11, 13, 15, 12, 14],
      statusDist: [['معلق', by('معلق')], ['قيد المعالجة', by('قيد المعالجة')], ['مكتمل', by('مكتمل')], ['ملغي', by('ملغي')]] as [string, number][],
      top: prods.slice().sort((a, b) => b.sold - a.sold).slice(0, 10).map(p => [p.name, p.sold] as [string, number]),
      stockByWh: [['المستودع الرئيسي', 240, 60], ['المستودع الفرعي', 140, 35], ['منطقة الطبلية', 90, 20]] as [string, number, number][],
      revenue: [12, 15, 14, 18, 16, 20, 19, 22, 21, 24, 23, 26].map(v => v * 1000),
    }
  },
}


