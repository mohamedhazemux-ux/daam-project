import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { merchantReturns } from './merchant-returns.service'
import { servicesService } from './services.service'
import { ordersService } from './orders.service'
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
    return { total: db.approvals.length, onboarding: by('تأهيل تاجر'), stockAdd: by('إضافة مخزون'), stockRemove: by('سحب مخزون'), returns: by('طلب إرجاع'), withdrawals: by('طلب سحب مالي'), services: by('طلب خدمة'), orders: by('طلب تنفيذ طلبية'), critical: db.approvals.filter(a => a.urgency !== 'عادي').length }
  },
  async approve(id: string, extra: { notes?: string; qty?: number; cost?: number; date?: string; staff?: string }) {
    await delay(400)
    const a = db.approvals.find(x => x.id === id)
    if (!a) throw new Error('طلب الموافقة غير موجود')
    if (a.sourceRef?.startsWith('ORD-') || a.type === 'طلب تنفيذ طلبية') {
      if (a.sourceRef) await ordersService.acceptOrder(a.sourceRef)
    }
    if (a.type === 'طلب خدمة' && a.sourceRef) {
      await servicesService.approveRequest(a.sourceRef, { cost: extra.cost ?? 0, date: extra.date ?? '', staff: extra.staff ?? '', notes: extra.notes ?? '' })
      return
    }
    if (a.sourceRef && (a.type === 'إضافة مخزون' || a.type === 'سحب مخزون')) {
      const request = db.stockRequests.find(x => x.id === a.sourceRef)
      if (!request) throw new Error('طلب المخزون المرتبط غير موجود')
      const qty = extra.qty ?? request.qty
      if (qty < 1 || qty > request.qty) throw new Error('الكمية المعتمدة غير صالحة')
      request.qty = qty
      request.status = 'معتمد'
      const level = db.stockLevels.find(x => x.p === request.p && x.wh === request.wh)
      if (level) level.avail = request.type === 'إضافة' ? level.avail + qty : Math.max(0, level.avail - qty)
    }
    if (a.sourceRef && a.type === 'طلب سحب مالي') {
      const withdrawal = db.withdrawals.find(x => x.id === a.sourceRef)
      if (!withdrawal) throw new Error('طلب السحب المرتبط غير موجود')
      withdrawal.status = 'معتمد'
    }
    if (a.sourceRef && a.type === 'طلب إرجاع') {
      const request = db.returns.find(x => x.ref === a.sourceRef)
      if (!request) throw new Error('طلب الإرجاع المرتبط غير موجود')
      request.status = 'معتمد'
      const merchantRequest = merchantReturns.find(x => x.ref === a.sourceRef)
      if (merchantRequest) {
        merchantRequest.status = 'معتمد'
        merchantRequest.timeline.unshift('معتمد بواسطة إدارة المنصة')
      }
    }
    db.approvals = db.approvals.filter(x => x.id !== id)
    audit('اعتماد طلب الموافقة ' + id + ' (' + a.type + ')' + (extra.qty ? ' — الكمية المعتمدة: ' + extra.qty : '') + (extra.cost ? ' — التكلفة: ' + extra.cost : ''), 'موافقات', 'اعتماد')
  },
  async reject(id: string, r: { reason: string; category: string; resubmit: string }) {
    await delay(400)
    const a = db.approvals.find(x => x.id === id)
    if (!a) throw new Error('طلب الموافقة غير موجود')
    if (a.sourceRef?.startsWith('ORD-') || a.type === 'طلب تنفيذ طلبية') {
      if (a.sourceRef) await ordersService.rejectOrder(a.sourceRef, r.reason)
    }
    if (a.type === 'طلب خدمة' && a.sourceRef) {
      await servicesService.rejectRequest(a.sourceRef, r.reason)
      return
    }
    if (a.sourceRef && (a.type === 'إضافة مخزون' || a.type === 'سحب مخزون')) {
      const request = db.stockRequests.find(x => x.id === a.sourceRef)
      if (request) request.status = 'مرفوض'
    }
    if (a.sourceRef && a.type === 'طلب سحب مالي') {
      const withdrawal = db.withdrawals.find(x => x.id === a.sourceRef)
      if (withdrawal) {
        withdrawal.status = 'مرفوض'
        const wallet = db.wallets.find(x => x.m === withdrawal.m)
        if (wallet) wallet.res = Math.max(0, wallet.res - withdrawal.amount)
      }
    }
    if (a.sourceRef && a.type === 'طلب إرجاع') {
      const request = db.returns.find(x => x.ref === a.sourceRef)
      if (request) { request.status = 'مرفوض'; request.reason = r.reason }
      const merchantRequest = merchantReturns.find(x => x.ref === a.sourceRef)
      if (merchantRequest) {
        merchantRequest.status = 'مرفوض'
        merchantRequest.timeline.unshift('مرفوض بواسطة الإدارة — السبب: ' + r.reason)
      }
    }
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
