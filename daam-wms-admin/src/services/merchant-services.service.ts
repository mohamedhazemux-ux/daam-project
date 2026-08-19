import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { merchantProducts } from './merchant-products.service'
import { todayISO } from '@/lib/utils'
import type { ListQuery, ListResult } from '@/types'
export interface ServiceRequestM { ref: string; m: string; type: string; desc: string; product?: string; qty: number; estCost: number; actualCost?: number; urgency: string; status: string; preferred?: string; notes: string; attachments: string[]; recurring: boolean; freq?: string; consent?: boolean; subscriptionId?: string; createdAt: string; timeline: string[] }
const seed = (): ServiceRequestM[] => {
  const s = db.merchants[0]?.store ?? ''
  return [
    { ref: 'SRV-M-001', m: s, type: 'تخزين موسع', desc: 'توفير مساحة تخزين إضافية', product: 'قهوة عربية مختصة 1كجم', qty: 2, estCost: 240, urgency: 'عادي', status: 'معلق', preferred: '2026-02-01', notes: 'نحتاج مساحة إضافية قبل موسم الطلبات القادم.', attachments: ['storage-plan.xlsx'], recurring: true, freq: 'شهري', consent: true, createdAt: '2026-01-10', timeline: ['معلق — 2026-01-10'] },
    { ref: 'SRV-M-002', m: s, type: 'تغليف هدايا', desc: 'تغليف طلبات المناسبات', qty: 10, estCost: 500, actualCost: 450, urgency: 'عاجل', status: 'معتمد', preferred: '2026-01-20', notes: 'يرجى استخدام ألوان التغليف المعتمدة للعلامة التجارية.', attachments: ['spec.pdf', 'gift-preview.jpg'], recurring: false, createdAt: '2026-01-05', timeline: ['معلق — 2026-01-05', 'معتمد بواسطة منى المطيري بتكلفة فعلية 450 — 2026-01-06'] },
  ]
}
export const SERVICE_REQUESTS: ServiceRequestM[] = seed()
let seq = 2
const FREQ_DAYS: Record<string, number> = { 'أسبوعي': 7, 'شهري': 30, 'ربع سنوي': 90, 'سنوي': 365 }
export const merchantServicesService = {
  async types() {
    await delay(100)
    return db.serviceTypes.filter(t => t.status === 'نشط')
  },
  async products(store: string) {
    await delay(100)
    return merchantProducts.filter(p => p.m === store && p.status === 'نشط')
  },
  async list(q: ListQuery & { store: string }): Promise<ListResult<ServiceRequestM>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const status = q.status as string
    const urgency = q.urgency as string
    const rows = SERVICE_REQUESTS.filter(x => x.m === q.store && (!t || x.ref.toLowerCase().includes(t) || x.type.toLowerCase().includes(t) || (x.product ?? '').toLowerCase().includes(t)) && (!status || x.status === status) && (!urgency || x.urgency === urgency))
    return paginate(rows, q)
  },
  async create(store: string, input: { type: string; product?: string; qty: number; preferred?: string; urgency: string; notes: string; attachments: string[]; consent: boolean }) {
    await delay(500)
    const st = db.serviceTypes.find(x => x.name === input.type)
    if (!st) throw new Error('نوع الخدمة غير موجود')
    const estCost = st.cost * input.qty
    const letter = (store.trim()[0] ?? 'M').toUpperCase()
    const ref = 'SRV-' + letter + '-' + String(++seq).padStart(3, '0')
    const recurring = st.model === 'متكرر'
    const merchant = db.merchants.find(x => x.store === store)
    SERVICE_REQUESTS.unshift({ ref, m: store, type: st.name, desc: st.desc, product: input.product, qty: input.qty, estCost, urgency: input.urgency, status: 'معلق', preferred: input.preferred, notes: input.notes, attachments: input.attachments, recurring, freq: recurring ? st.freq : undefined, consent: input.consent, createdAt: todayISO(), timeline: ['معلق — ' + todayISO()] })
    db.serviceRequests.unshift({ ref, m: store, email: merchant?.email ?? '', type: st.name, prod: input.product ?? '—', qty: input.qty, cost: estCost, urgency: input.urgency as 'عادي' | 'عاجل' | 'حرج', date: input.preferred ?? todayISO(), req: input.notes, status: 'معلق', notes: input.notes, attachment: input.attachments.length ? input.attachments.join(', ') : undefined })
    db.approvals.unshift({ id: 'APR-' + (600 + db.approvals.length + 1), type: 'طلب خدمة', who: store, title: 'طلب خدمة ' + ref + ' — ' + st.name + ' (تكلفة تقديرية ' + estCost + ')', urgency: input.urgency, date: todayISO(), days: 0, sourceRef: ref })
    audit('إنشاء طلب خدمة ' + ref + ' — النوع: ' + st.name + ' — الكمية: ' + input.qty + ' — التكلفة التقديرية: ' + estCost + ' — الإلحاح: ' + input.urgency + (recurring ? ' — فوترة متكررة ' + st.freq : ''), 'خدمات التاجر', 'إنشاء')
    return ref
  },
  async details(ref: string) {
    await delay(150)
    const x = SERVICE_REQUESTS.find(v => v.ref === ref)
    if (!x) throw new Error('طلب الخدمة غير موجود')
    return x
  },
  async cancel(ref: string) {
    await delay(300)
    const x = SERVICE_REQUESTS.find(v => v.ref === ref)
    if (!x) throw new Error('طلب الخدمة غير موجود')
    if (x.status !== 'معلق') throw new Error('يمكن إلغاء طلبات الخدمة المعلقة فقط')
    x.status = 'ملغي'
    x.timeline.unshift('ملغي بواسطة التاجر — ' + todayISO())
    const adminRequest = db.serviceRequests.find(v => v.ref === ref)
    if (adminRequest) adminRequest.status = 'ملغي'
    db.approvals = db.approvals.filter(a => a.sourceRef !== ref)
    audit('إلغاء طلب الخدمة ' + ref + ' بواسطة التاجر', 'خدمات التاجر', 'تعديل')
  },
  firstBilling: (freq: string) => { const d = new Date(); d.setDate(d.getDate() + (FREQ_DAYS[freq] ?? 30)); return d.toISOString().slice(0, 10) },
}
