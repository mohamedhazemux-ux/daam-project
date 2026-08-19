import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { todayISO } from '@/lib/utils'
import type { ListQuery, ListResult, PlatformProduct } from '@/types'
const DELETED: (PlatformProduct & { deletedAt: string })[] = []
export const productsService = {
  async list(q: ListQuery): Promise<ListResult<PlatformProduct>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const status = String(q.status ?? '').trim()
    const rows = db.pltProducts.filter(p => {
      if (t && !p.name.toLowerCase().includes(t) && !p.ref.toLowerCase().includes(t)) return false
      if (status) {
        if (status === 'نشط' && p.status !== 'نشط') return false
        if ((status === 'غير نشط' || status === 'معطل') && p.status === 'نشط') return false
      }
      return true
    })
    return paginate(rows, q)
  },
  async create(input: { name: string; desc: string; status: 'نشط' | 'غير نشط' }) {
    await delay(400)
    if (db.pltProducts.some(p => p.name === input.name)) throw new Error('اسم المنتج هذا موجود بالفعل')
    const ref = 'PLT-' + String(++db.seq.plt).padStart(3, '0')
    db.pltProducts.unshift({ ref, ...input, created: todayISO(), linked: false })
    audit('إنشاء منتج منصة ' + ref + ' (' + input.name + ')', 'منتجات المنصة', 'إنشاء')
    return ref
  },
  async update(ref: string, patch: Partial<PlatformProduct>) {
    await delay(300)
    const p = db.pltProducts.find(x => x.ref === ref)
    if (!p) throw new Error('منتج المنصة غير موجود')
    Object.assign(p, patch)
    audit('تعديل منتج منصة ' + ref + ' (' + p.name + ')', 'منتجات المنصة', 'تعديل')
  },
  async toggle(ref: string) {
    await delay(250)
    const p = db.pltProducts.find(x => x.ref === ref)
    if (!p) throw new Error('منتج المنصة غير موجود')
    p.status = p.status === 'نشط' ? 'غير نشط' : 'نشط'
    audit('تغيير حالة منتج منصة ' + ref + ' إلى ' + p.status, 'منتجات المنصة')
    return p.status === 'نشط' ? 'تم تفعيل منتج المنصة بنجاح' : 'تم تعطيل منتج المنصة بنجاح'
  },
  async remove(ref: string) {
    await delay(300)
    const p = db.pltProducts.find(x => x.ref === ref)
    if (!p) throw new Error('منتج المنصة غير موجود')
    if (p.linked) throw new Error('تحذير: منتج المنصة ' + p.name + ' مرتبط ببعض الطلبات النشطة')
    DELETED.push({ ...p, deletedAt: todayISO() })
    db.pltProducts = db.pltProducts.filter(x => x.ref !== ref)
    audit('حذف منتج منصة ' + ref + ' (' + p.name + ') — البيانات محفوظة للاستعادة', 'منتجات المنصة', 'حذف')
  },
  async deletedList() {
    await delay(150)
    return [...DELETED]
  },
  async restore(ref: string) {
    await delay(300)
    const index = DELETED.findIndex(product => product.ref === ref)
    if (index < 0) throw new Error('منتج المنصة غير موجود')
    const product = { ...DELETED[index] }
    delete (product as { deletedAt?: string }).deletedAt
    db.pltProducts.unshift(product)
    DELETED.splice(index, 1)
    return product
  },
}

