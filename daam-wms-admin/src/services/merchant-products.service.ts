import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { todayISO } from '@/lib/utils'
import { merchantSettingsService } from './merchant-settings.service'
import type { ListQuery, ListResult } from '@/types'
export interface MerchantProduct { ref: string; m: string; name: string; sku: string; desc: string; qty: number; price: number; status: 'نشط' | 'معطل' | 'غير نشط'; sold: number; created: string; log: string[]; img?: string }
const seed = (): MerchantProduct[] => {
  const out: MerchantProduct[] = []
  const names: [string, number, 'نشط' | 'معطل' | 'غير نشط'][] = [
    ['قهوة عربية مختصة 1كجم', 180, 'نشط'],
    ['بن محمص كولومبي 500جم', 95, 'معطل'],
    ['أكياس قهوة ورقية (50 قطعة)', 40, 'نشط'],
    ['فلاتر تقطير ورقية V60', 25, 'غير نشط'],
    ['منظف أرضيات معطر 3لتر', 35, 'نشط'],
    ['معقم أسطح 1لتر', 22, 'معطل'],
    ['فوط مايكروفايبر (10 قطع)', 30, 'نشط'],
    ['بخاخ منظف زجاج 750مل', 19, 'غير نشط'],
    ['بن أخضر إثيوبي 5كجم', 260, 'نشط'],
    ['أكياس تغليف حرارية (100)', 55, 'معطل'],
    ['معطر جو فندقي 500مل', 28, 'نشط'],
  ]
  db.merchants.forEach((m, mi) => {
    const storeItems = [
      { name: 'قهوة عربية مختصة 1كجم', price: 180, status: 'نشط' as const, qty: 65 },
      { name: 'بن محمص كولومبي 500جم', price: 95, status: 'غير نشط' as const, qty: 0 },
      { name: 'أكياس قهوة ورقية (50 قطعة)', price: 40, status: 'نشط' as const, qty: 120 },
      { name: 'فلاتر تقطير ورقية V60', price: 25, status: 'معطل' as const, qty: 15 },
      { name: 'معطر جو فاخر 500مل', price: 35, status: 'نشط' as const, qty: 40 },
    ]
    storeItems.forEach((it, i) => {
      out.push({
        ref: 'PRD-' + String(out.length + 1).padStart(3, '0'),
        m: m.store,
        name: it.name + (mi > 0 ? ` — ${m.store}` : ''),
        sku: 'SKU-' + (1000 + out.length * 7),
        desc: 'منتج أساسي ضمن كتالوج التاجر في المنصة الداعمة WMS',
        qty: it.qty,
        price: it.price,
        status: it.status,
        sold: 50 + i * 20,
        created: '2025-11-0' + ((i % 9) + 1),
        log: ['إنشاء المنتج بواسطة التاجر'],
      })
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
    const status = String(q.status ?? '').trim()
    const rows = merchantProducts.filter(p => {
      if (p.m !== q.store) return false
      if (t && !p.name.toLowerCase().includes(t) && !p.sku.toLowerCase().includes(t)) return false
      if (status) {
        if (status === 'نشط' && p.status !== 'نشط') return false
        if ((status === 'غير نشط' || status === 'معطل') && p.status === 'نشط') return false
      }
      return true
    })
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
  /** تنزيل قالب Excel/CSV لرفع المنتجات بكميات كبيرة */
  async downloadTemplate() {
    await delay(200)
    const headers = ['اسم المنتج', 'رمز المنتج (SKU)', 'وصف المنتج', 'الكمية المتاحة', 'السعر', 'الطول (سم)', 'العرض (سم)', 'الارتفاع (سم)']
    const sample = [
      ['قهوة عربية مختصة 1كجم', 'SKU-1001', 'بن محمص طازج', '100', '180', '30', '20', '15'],
      ['منظف أرضيات معطر 3لتر', 'SKU-1002', 'منتج تنظيف', '50', '35', '25', '15', '10'],
    ]
    const csv = '\uFEFF' + [headers, ...sample].map(r => r.map(c => `"${c}"`).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'daam-products-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    audit('تنزيل قالب رفع المنتجات', 'منتجات التاجر')
  },
}


