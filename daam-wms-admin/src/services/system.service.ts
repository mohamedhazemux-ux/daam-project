import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import type { AppNotification, AuditLog, ListQuery, ListResult, NotifEvent } from '@/types'

const URGENCY: Record<string, number> = { 'حرج': 0, 'عاجل': 1, 'عادي': 2 }

export const systemService = {
  async notifications(q: ListQuery): Promise<ListResult<AppNotification>> {
    await delay(200)
    const t = String(q.q ?? '').trim(), type = q.type as string
    return paginate(db.notifications.filter(n => (!t || n.title.includes(t) || n.msg.includes(t)) && (!type || n.type === type)), q)
  },
  async unreadCount(): Promise<number> { await delay(120); return db.notifications.filter(n => n.unread).length },
  async markRead(id: string) { const n = db.notifications.find(x => x.id === id); if (n) n.unread = false; audit('تحديد إشعار كمقروء', 'مركز الإشعارات') },
  async markAllRead() { db.notifications.forEach(n => (n.unread = false)); audit('تحديد الإشعارات كمقروءة', 'مركز الإشعارات') },
  async removeNotification(id: string) {
    await delay(150)
    db.notifications = db.notifications.filter(notification => notification.id !== id)
    audit('حذف إشعار', 'مركز الإشعارات', 'حذف')
  },
  async approvalsCount(): Promise<number> { await delay(100); return db.approvals.length },
  async notifEvents(): Promise<NotifEvent[]> { await delay(200); return db.notifEvents },
  async toggleEvent(name: string, ch: 'email' | 'app' | 'sms') {
    const e = db.notifEvents.find(x => x.name === name)
    if (e) e[ch] = !e[ch]
    audit('تعديل قنوات الإشعار للحدث: ' + name, 'إعدادات', 'تعديل')
  },
  async logs(q: ListQuery): Promise<ListResult<AuditLog>> {
    await delay()
    const t = String(q.q ?? '').trim(), type = q.type as string
    return paginate(db.logs.filter(l => (!t || l.desc.includes(t) || l.actor.includes(t)) && (!type || l.type === type)), q)
  },
  async saveSettings(section: string) { await delay(400); audit('تحديث معاملات النظام (' + section + ')', 'إعدادات', 'تعديل') },
  async dashboard() {
    await delay(350)
    return {
      activeMerchants: db.merchants.filter(m => m.status === 'نشط').length,
      products: db.stockLevels.length + db.pltProducts.length,
      orders: db.orders.length,
      pendingApprovals: db.approvals.length,
      pendingOrders: db.orders.filter(o => o.status === 'معلق').length,
      returnsToday: db.returns.filter(r => r.date >= '2026-02-09').length,
      revenueToday: db.orders.filter(o => o.date >= '2026-02-10').reduce((s, o) => s + o.total, 0),
      walletsTotal: db.wallets.reduce((s, w) => s + w.bal, 0),
      lowStock: db.stockLevels.filter(s => s.avail < 50).length,
      criticalServices: db.serviceRequests.filter(s => s.urgency === 'حرج' && s.status === 'معلق').length,
      storageExceeded: db.merchants.filter(m => m.limit > 0 && m.used >= m.limit).length,
      trend: [38, 42, 35, 50, 47, 61, 55, 49, 58, 64, 60, 72, 68, 61, 75, 80, 71, 66, 78, 84, 79, 88, 92, 85, 90, 96, 89, 94, 102, 108],
      statusDist: [
        { label: 'مكتمل', value: 38, color: '#1a7f37' },
        { label: 'قيد المعالجة', value: 17, color: '#1d4ed8' },
        { label: 'معلق', value: 12, color: '#b45309' },
        { label: 'ملغي', value: 4, color: '#c62828' },
      ],
      topMerchants: [
        { label: 'مؤسسة ركن القهوة', value: 214 },
        { label: 'متجر البن الذهبي', value: 186 },
        { label: 'متجر النقاء للتنظيف', value: 158 },
        { label: 'متجر الجمال الحديث', value: 121 },
        { label: 'متجر قهوة المختصين', value: 96 },
      ],
      storageUse: db.merchants.filter(m => m.limit > 0).map(m => ({ label: m.store, value: Math.min(100, Math.round((m.used / m.limit) * 100)) })).sort((a, b) => b.value - a.value).slice(0, 6),
      approvals: [...db.approvals].sort((a, b) => URGENCY[a.urgency] - URGENCY[b.urgency]).slice(0, 5),
    }
  },
}

