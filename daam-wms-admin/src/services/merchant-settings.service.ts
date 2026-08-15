import { audit } from './audit.service'
export const NOTIF_EVENTS = ['تحديث حالة الطلب', 'طلب المخزون معتمد', 'طلب المرتجع مرفوض', 'السحب معتمد', 'طلب الخدمة مكتمل', 'إشعار الفاتورة']
export interface MerchantSettings { notif: Record<string, { email: boolean; app: boolean }>; defaultShip: '' | 'منصة' | 'ذاتي'; defaultMethod: string; lowStockThreshold: number; storageAlertPct: number }
const KEY = 'daam-merchant-settings'
const defaults = (): MerchantSettings => ({ notif: Object.fromEntries(NOTIF_EVENTS.map(e => [e, { email: true, app: true }])), defaultShip: '', defaultMethod: 'الشحن القياسي', lowStockThreshold: 25, storageAlertPct: 80 })
const readAll = (): Record<string, MerchantSettings> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
export const merchantSettingsService = {
  loadSync(store: string): MerchantSettings {
    const all = readAll()
    const saved = all[store]
    return { ...defaults(), ...saved, notif: { ...defaults().notif, ...(saved?.notif ?? {}) } }
  },
  save(store: string, s: MerchantSettings) {
    const all = readAll()
    all[store] = s
    localStorage.setItem(KEY, JSON.stringify(all))
    audit('تحديث إعدادات التاجر: ' + store, 'إعدادات التاجر', 'تعديل')
  },
}
