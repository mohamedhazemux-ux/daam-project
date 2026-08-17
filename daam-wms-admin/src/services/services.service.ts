import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { SERVICE_REQUESTS } from './merchant-services.service'
import type { ListQuery, ListResult, ServiceRequest, ServiceType, Subscription } from '@/types'
export const servicesService = {
  async requests(q: ListQuery): Promise<ListResult<ServiceRequest>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const status = q.status as string
    const urgency = q.urgency as string
    const rows = db.serviceRequests.filter(s =>
      (!t || [s.ref, s.m, s.email, s.type, s.prod].some(x => x.toLowerCase().includes(t))) &&
      (!status || s.status === status) && (!urgency || s.urgency === urgency))
    return paginate(rows, q)
  },
  async approveRequest(ref: string, data: { cost: number; date: string; staff: string; notes: string }) {
    await delay(400)
    const s = db.serviceRequests.find(x => x.ref === ref)
    if (!s) throw new Error('طلب الخدمة غير موجود')
    const st = db.serviceTypes.find(x => x.name === s.type)
    const wallet = db.wallets.find(x => x.m === s.m)
    if (wallet && wallet.bal < data.cost) throw new Error('رصيد محفظة التاجر غير كافٍ لاعتماد طلب الخدمة هذا')
    s.status = 'معتمد'
    if (wallet) wallet.bal -= data.cost
    let subId = ''
    if (st?.model === 'متكرر') {
      subId = 'SUB-' + (5000 + db.subscriptions.length + 1)
      db.subscriptions.unshift({ id: subId, m: s.m, type: s.type, cost: data.cost, freq: st.freq, next: '2026-03-15', status: 'نشط', total: data.cost, start: data.date })
    }
    const merchantRequest = SERVICE_REQUESTS.find(x => x.ref === ref)
    if (merchantRequest) {
      merchantRequest.status = 'معتمد'
      merchantRequest.actualCost = data.cost
      merchantRequest.subscriptionId = subId || undefined
      merchantRequest.timeline.unshift('معتمد بواسطة ' + data.staff + ' بتكلفة فعلية ' + data.cost + ' — ' + data.date)
    }
    db.approvals = db.approvals.filter(a => a.sourceRef !== ref)
    audit('اعتماد طلب الخدمة ' + ref + ' — التكلفة: ' + data.cost + ' — الموظف: ' + data.staff + (subId ? ' — اشتراك: ' + subId : ''), 'خدمات', 'اعتماد')
    return subId
  },
  async rejectRequest(ref: string, reason: string) {
    await delay(300)
    const s = db.serviceRequests.find(x => x.ref === ref)
    if (!s) throw new Error('طلب الخدمة غير موجود')
    s.status = 'مرفوض'
    const merchantRequest = SERVICE_REQUESTS.find(x => x.ref === ref)
    if (merchantRequest) {
      merchantRequest.status = 'مرفوض'
      merchantRequest.timeline.unshift('مرفوض بواسطة الإدارة — السبب: ' + reason)
    }
    db.approvals = db.approvals.filter(a => a.sourceRef !== ref)
    audit('رفض طلب الخدمة ' + ref + ' — السبب: ' + reason, 'خدمات', 'رفض')
  },
  async advanceStatus(ref: string) {
    await delay(300)
    const s = db.serviceRequests.find(x => x.ref === ref)
    if (!s) throw new Error('طلب الخدمة غير موجود')
    const next = s.status === 'معتمد' ? 'قيد التنفيذ' : s.status === 'قيد التنفيذ' ? 'مكتمل' : null
    if (!next) throw new Error('انتقال حالة غير صالح من ' + s.status)
    s.status = next
    const merchantRequest = SERVICE_REQUESTS.find(x => x.ref === ref)
    if (merchantRequest) {
      merchantRequest.status = next
      merchantRequest.timeline.unshift(next + ' بواسطة إدارة المنصة')
    }
    audit('تحديث حالة طلب الخدمة ' + ref + ' إلى ' + next, 'خدمات', 'تعديل')
    return next
  },
  async subscriptions(q: ListQuery): Promise<ListResult<Subscription>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const status = q.status as string
    const freq = q.freq as string
    const rows = db.subscriptions.filter(s => (!t || s.m.includes(t) || s.type.includes(t)) && (!status || s.status === status) && (!freq || s.freq === freq))
    return paginate(rows, q)
  },
  async cancelSubscription(id: string) {
    await delay(300)
    const s = db.subscriptions.find(x => x.id === id)
    if (!s) throw new Error('الاشتراك غير موجود')
    s.status = 'ملغي'
    audit('إلغاء الاشتراك ' + id + ' (' + s.type + ') بواسطة المدير', 'خدمات', 'تعديل')
  },
  async types(q: ListQuery): Promise<ListResult<ServiceType>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const rows = db.serviceTypes.filter(s => !t || s.name.includes(t))
    return paginate(rows, q)
  },
  async saveType(input: ServiceType, oldName?: string) {
    await delay(400)
    if (db.serviceTypes.some(x => x.name === input.name && x.name !== oldName)) throw new Error('اسم الخدمة هذا موجود بالفعل')
    if (oldName) Object.assign(db.serviceTypes.find(x => x.name === oldName)!, input)
    else db.serviceTypes.push(input)
    audit('حفظ نوع خدمة: ' + input.name, 'خدمات', oldName ? 'تعديل' : 'إنشاء')
  },
  async toggleType(name: string) {
    await delay(250)
    const s = db.serviceTypes.find(x => x.name === name)
    if (!s) throw new Error('نوع الخدمة غير موجود')
    s.status = s.status === 'نشط' ? 'غير نشط' : 'نشط'
    audit('تغيير حالة نوع الخدمة ' + name + ' إلى ' + s.status, 'خدمات')
    return s.status === 'نشط' ? 'تم تفعيل نوع الخدمة بنجاح' : 'تم تعطيل نوع الخدمة بنجاح'
  },
}
