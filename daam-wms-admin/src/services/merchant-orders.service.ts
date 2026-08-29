import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { merchantProducts } from './merchant-products.service'
import { todayISO } from '@/lib/utils'
import type { ListQuery, ListResult } from '@/types'
export interface OrderItem { name: string; qty: number; price: number; notes?: string; platform?: boolean }
export interface MerchantOrder { ref: string; m: string; cust: string; address: string; date: string; status: 'معلق' | 'قيد التنفيذ' | 'قيد التغليف' | 'جاهز للاستلام' | 'قيد التوصيل' | 'مكتمل' | 'مرفوض' | 'ملغي' | string; shipResp: 'منصة' | 'ذاتي'; method?: string; shipCost?: number; tracking?: string; label?: string; notes?: string; attachments?: string[]; items: OrderItem[]; total: number; log: string[] }
const seed = (): MerchantOrder[] => {
  const store = db.merchants[0]?.store ?? ''
  return [
    { ref: 'ORD-901', m: store, cust: 'أحمد السالم', address: 'الرياض — حي النرجس', date: '2026-01-08', status: 'قيد المعالجة', shipResp: 'منصة', method: 'الشحن القياسي', shipCost: 25, notes: 'يرجى التأكد من مطابقة الكمية قبل الإرسال.', attachments: ['order-checklist.pdf'], items: [{ name: 'قهوة عربية مختصة 1كجم', qty: 2, price: 180 }, { name: 'بن محمص كولومبي 500جم', qty: 1, price: 95 }], total: 2 * 180 + 95 + 25, log: ['إنشاء الطلب بواسطة التاجر — 2026-01-08', 'تحديث الحالة إلى قيد المعالجة بواسطة المنصة — 2026-01-09'] },
    { ref: 'ORD-902', m: store, cust: 'سارة العتيبي', address: 'جدة — حي الروضة', date: '2026-01-10', status: 'معلق', shipResp: 'ذاتي', tracking: 'TRK-889912', label: 'waybill-902.pdf', notes: 'العميل طلب الاتصال قبل التسليم.', attachments: ['waybill-902.pdf', 'delivery-note.txt'], items: [{ name: 'أكياس قهوة ورقية (50 قطعة)', qty: 3, price: 40 }], total: 120, log: ['إنشاء الطلب بواسطة التاجر (شحن ذاتي + بوليصة مرفقة) — 2026-01-10'] },
    { ref: 'ORD-903', m: store, cust: 'خالد المطيري', address: 'الدمام — حي الشاطئ', date: '2026-01-12', status: 'مكتمل', shipResp: 'منصة', method: 'الشحن السريع', shipCost: 45, notes: 'تم التسليم دون ملاحظات إضافية.', items: [{ name: 'قهوة عربية مختصة 1كجم', qty: 1, price: 180, platform: false }], total: 225, log: ['إنشاء الطلب — 2026-01-12', 'اكتمال الطلب — 2026-01-14'] },
    { ref: 'ORD-904', m: store, cust: 'عبدالرحمن الشهري', address: 'الرياض — حي الملقا', date: '2026-01-15', status: 'ملغي', shipResp: 'ذاتي', notes: 'تم إلغاء الطلب بناء على رغبة العميل قبل خروج الشحنة.', items: [{ name: 'بن محمص كولومبي 500جم', qty: 2, price: 95 }], total: 190, log: ['إنشاء الطلب — 2026-01-15', 'إلغاء الطلب — 2026-01-16'] },
  ]
}
export const merchantOrders: MerchantOrder[] = seed()
let seq = 904
export const SHIP_METHODS = [{ name: 'الشحن القياسي', cost: 25 }, { name: 'الشحن السريع', cost: 45 }]
export const merchantOrdersService = {
  async list(q: ListQuery & { store: string }): Promise<ListResult<MerchantOrder>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const status = q.status as string
    const ship = q.ship as string
    const rows = merchantOrders.filter(o => o.m === q.store &&
      (!t || o.ref.toLowerCase().includes(t) || o.cust.toLowerCase().includes(t) || o.items.some(i => i.name.toLowerCase().includes(t))) &&
      (!status || o.status === status) && (!ship || o.shipResp === ship))
    return paginate(rows, q)
  },
  async options(store: string) {
    await delay(150)
    return {
      mine: merchantProducts.filter(p => p.m === store && p.status === 'نشط').map(p => ({ name: p.name, price: p.price })),
      platform: db.pltProducts.filter(p => p.status === 'نشط').map((p, i) => ({ name: p.name, price: 45 + i * 10 })),
      methods: SHIP_METHODS,
    }
  },
  async create(store: string, input: { cust: string; address: string; shipResp: 'منصة' | 'ذاتي'; method?: string; tracking?: string; label?: string; items: OrderItem[] }) {
    await delay(500)
    const shipCost = input.shipResp === 'منصة' ? SHIP_METHODS.find(m => m.name === input.method)?.cost ?? 0 : 0
    const total = input.items.reduce((s, i) => s + i.qty * i.price, 0) + shipCost
    const ref = 'ORD-' + ++seq
    merchantOrders.unshift({ ref, m: store, cust: input.cust, address: input.address, date: todayISO(), status: 'معلق', shipResp: input.shipResp, method: input.method, shipCost, tracking: input.tracking, label: input.label, items: input.items, total, log: ['إنشاء الطلب بواسطة التاجر — ' + todayISO() + (input.shipResp === 'ذاتي' ? ' (شحن ذاتي + بوليصة مرفقة)' : '')] })
    db.orders.unshift({ id: ref, m: store, cust: input.cust, date: todayISO(), status: 'معلق', items: input.items.reduce((s, i) => s + i.qty, 0), total, ship: input.shipResp, notes: '', attachments: input.label ? [input.label] : undefined })
    audit('إنشاء طلب ' + ref + ' — العميل: ' + input.cust + ' — مسؤولية الشحن: ' + input.shipResp + ' — الإجمالي: ' + total, 'طلبات التاجر', 'إنشاء')
    return ref
  },
  async details(ref: string) {
    await delay(200)
    const o = merchantOrders.find(x => x.ref === ref)
    if (!o) throw new Error('الطلب غير موجود')
    return o
  },
  async cancel(ref: string) {
    await delay(300)
    const o = merchantOrders.find(x => x.ref === ref)
    if (!o) throw new Error('الطلب غير موجود')
    if (o.status !== 'معلق') throw new Error('يمكن إلغاء الطلبات المعلقة فقط')
    o.status = 'ملغي'
    o.log.unshift('إلغاء الطلب بواسطة التاجر — ' + todayISO())
    const adm = db.orders.find(x => x.id === ref)
    if (adm) adm.status = 'ملغي'
    audit('إلغاء الطلب ' + ref + ' بواسطة التاجر', 'طلبات التاجر', 'تعديل')
  },
}
