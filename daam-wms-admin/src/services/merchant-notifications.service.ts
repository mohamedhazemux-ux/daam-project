import { delay, paginate } from './http'
import { audit } from './audit.service'
import type { ListQuery, ListResult } from '@/types'
export interface MNotif { id: string; title: string; msg: string; type: 'معلومات' | 'نجاح' | 'تحذير' | 'تنبيه'; ref?: string; store?: string; unread: boolean; time: string }
const NOTIFS: MNotif[] = [
  { id: 'MN-1', title: 'تحديث حالة الطلب', msg: 'تم تحديث حالة الطلب ORD-903 إلى مكتمل بواسطة المنصة.', type: 'نجاح', ref: 'ORD-903', unread: true, time: '2026-01-14 10:20' },
  { id: 'MN-2', title: 'طلب مخزون معتمد', msg: 'تم اعتماد طلب إضافة المخزون SR-501 وسيتم تنفيذ الإضافة خلال 24 ساعة.', type: 'نجاح', ref: 'SR-501', unread: true, time: '2026-01-13 09:00' },
  { id: 'MN-3', title: 'تنبيه تخزين', msg: 'اقترب استخدامك من حد التخزين المجاني (80%). يرجى مراجعة مستويات المخزون لتجنب رسوم التجاوز.', type: 'تحذير', unread: true, time: '2026-01-12 14:45' },
  { id: 'MN-4', title: 'فاتورة شهرية', msg: 'تم توليد فاتورتك الشهرية لشهر ديسمبر 2025 وإرسالها إلى بريدك الإلكتروني. يمكنك تنزيلها من قسم المحفظة والمالية.', type: 'معلومات', ref: 'INV-M-202512-001', unread: false, time: '2026-01-01 02:00' },
  { id: 'MN-5', title: 'تنبيه دفع', msg: 'فشلت محاولة خصم رسوم الخدمة المتكررة بسبب نقص الرصيد. يرجى شحن المحفظة لتجنب إيقاف الاشتراك.', type: 'تنبيه', unread: false, time: '2026-01-19 00:05' },
]
export const merchantNotificationsService = {
  async list(q: ListQuery & { store?: string }): Promise<ListResult<MNotif>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const type = q.type as string
    const rows = NOTIFS.filter(n => (!q.store || !n.store || n.store === q.store) && (!t || n.title.includes(t) || n.msg.includes(t)) && (!type || n.type === type))
    return paginate(rows, q)
  },
  async unreadCount() {
    await delay(50)
    return NOTIFS.filter(n => n.unread).length
  },
  notify(store: string, input: Omit<MNotif, 'id' | 'store' | 'unread' | 'time'>) {
    NOTIFS.unshift({ ...input, store, id: 'MN-' + Date.now(), unread: true, time: new Date().toISOString().slice(0, 16).replace('T', ' ') })
  },
  async markRead(id: string) {
    const n = NOTIFS.find(x => x.id === id)
    if (n) n.unread = false
    audit('تحديد إشعار كمقروء: ' + id, 'مركز الإشعارات')
  },
  async markAllRead() {
    NOTIFS.forEach(n => { n.unread = false })
    audit('تحديد كل الإشعارات كمقروءة', 'مركز الإشعارات')
  },
  async remove(id: string) {
    const i = NOTIFS.findIndex(x => x.id === id)
    if (i > -1) NOTIFS.splice(i, 1)
    audit('حذف إشعار: ' + id, 'مركز الإشعارات', 'حذف')
  },
}
