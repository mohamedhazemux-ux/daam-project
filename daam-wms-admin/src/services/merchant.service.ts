import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { todayISO } from '@/lib/utils'
import type { ListQuery, ListResult, Merchant } from '@/types'

export const storageStatus = (used: number, limit: number) =>
  !limit || used >= limit ? 'متجاوز' : used / limit >= 0.8 ? 'تحذير' : 'اعتيادي'

export const merchantService = {
  async list(q: ListQuery): Promise<ListResult<Merchant>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const status = q.status as string
    const join = q.join as string
    const rows = db.merchants.filter(m =>
      (!t || [m.store, m.first + ' ' + m.last, m.email, m.phone].some(x => x.includes(t))) &&
      (!status || m.status === status) && (!join || m.join === join))
    return paginate(rows, q)
  },
  async emailExists(email: string, excludeId?: string) {
    await delay(150)
    return db.merchants.some(m => m.email === email && m.id !== excludeId)
  },
  async create(input: Omit<Merchant, 'id' | 'status' | 'join' | 'created' | 'used'>) {
    await delay(500)
    const id = 'M-' + String(++db.seq.merchant).padStart(3, '0')
    db.merchants.unshift({ ...input, id, status: 'نشط', join: 'غير منضم بعد', created: todayISO(), used: 0 })
    audit('إنشاء تاجر جديد: ' + input.store + ' (حالة إرسال البريد: تم الإرسال)', 'تجار', 'إنشاء')
    return id
  },
  async update(id: string, patch: Partial<Merchant>) {
    await delay(400)
    const m = db.merchants.find(x => x.id === id)
    if (!m) throw new Error('التاجر غير موجود')
    Object.assign(m, patch)
    audit('تعديل بيانات التاجر ' + m.store, 'تجار', 'تعديل')
  },
  async setStatus(id: string) {
    await delay(300)
    const m = db.merchants.find(x => x.id === id)
    if (!m) throw new Error('التاجر غير موجود')
    m.status = m.status === 'نشط' ? 'موقوف' : 'نشط'
    audit('تغيير حالة التاجر ' + m.store + ' إلى ' + m.status, 'تجار')
    return m.status
  },
  async remove(id: string) {
    await delay(400)
    const m = db.merchants.find(x => x.id === id)
    db.merchants = db.merchants.filter(x => x.id !== id)
    audit('حذف التاجر ' + (m?.store ?? id), 'تجار', 'حذف')
  },
}
