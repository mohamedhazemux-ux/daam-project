import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import type { Approval, ListQuery, ListResult } from '@/types'
const URGENCY: Record<string, number> = { 'حرج': 0, 'عاجل': 1, 'عادي': 2 }
export const approvalsService = {
  async list(q: ListQuery): Promise<ListResult<Approval>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const type = q.type as string
    const urgency = q.urgency as string
    const rows = [...db.approvals]
      .filter(a => (!t || [a.id, a.type, a.who, a.title].some(x => x.toLowerCase().includes(t))) && (!type || a.type === type) && (!urgency || (urgency === 'critical' ? a.urgency !== 'عادي' : a.urgency === urgency)))
      .sort((a, b) => URGENCY[a.urgency] - URGENCY[b.urgency] || a.date.localeCompare(b.date))
    return paginate(rows, q)
  },
  async dashboard() {
    await delay(200)
    const by = (t: string) => db.approvals.filter(a => a.type === t).length
    return { total: db.approvals.length, onboarding: by('تأهيل تاجر'), stockAdd: by('إضافة مخزون'), stockRemove: by('سحب مخزون'), returns: by('طلب إرجاع'), withdrawals: by('طلب سحب مالي'), services: by('طلب خدمة'), critical: db.approvals.filter(a => a.urgency !== 'عادي').length }
  },
  async approve(id: string, extra: { notes?: string; qty?: number; cost?: number; date?: string; staff?: string }) {
    await delay(400)
    const a = db.approvals.find(x => x.id === id)
    if (!a) throw new Error('طلب الموافقة غير موجود')
    db.approvals = db.approvals.filter(x => x.id !== id)
    audit('اعتماد طلب الموافقة ' + id + ' (' + a.type + ')' + (extra.qty ? ' — الكمية المعتمدة: ' + extra.qty : '') + (extra.cost ? ' — التكلفة: ' + extra.cost : ''), 'موافقات', 'اعتماد')
  },
  async reject(id: string, r: { reason: string; category: string; resubmit: string }) {
    await delay(400)
    const a = db.approvals.find(x => x.id === id)
    if (!a) throw new Error('طلب الموافقة غير موجود')
    db.approvals = db.approvals.filter(x => x.id !== id)
    audit('رفض طلب الموافقة ' + id + ' (' + a.type + ') — التصنيف: ' + r.category + ' — إعادة التقديم: ' + r.resubmit + ' — السبب: ' + r.reason, 'موافقات', 'رفض')
  },
  async requestInfo(id: string, info: string, deadline: string) {
    await delay(300)
    audit('طلب معلومات إضافية للموافقة ' + id + ' — الموعد النهائي: ' + deadline + ' — المطلوب: ' + info, 'موافقات')
  },
  async assign(id: string, approver: string, reason: string) {
    await delay(300)
    audit('إسناد الموافقة ' + id + ' إلى ' + approver + ' — السبب: ' + reason, 'موافقات', 'تعديل')
  },
}
