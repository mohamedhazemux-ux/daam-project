import { db } from '@/mocks/db'
import { delay } from './http'
import { audit } from './audit.service'
import { storageStatus } from './merchant.service'
import type { SessionUser } from '@/types'
export const MERCHANT_DEFAULT_PWD = 'Merchant@123'
const LS_KEY = 'daam-merchant-passwords'
const loadPwds = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') } catch { return {} } }
const savePwds = (m: Record<string, string>) => localStorage.setItem(LS_KEY, JSON.stringify(m))
const pwdOf = (email: string) => loadPwds()[email] ?? MERCHANT_DEFAULT_PWD
let otp: { email: string; code: string; expires: number; resends: number } | null = null
export const merchantPortalService = {
  async demoAccounts() {
    await delay(100)
    return db.merchants.filter(m => m.status !== 'موقوف').slice(0, 3).map(m => ({ email: m.email, store: m.store }))
  },
  async login(email: string, pwd: string): Promise<SessionUser> {
    await delay(500)
    const m = db.merchants.find(x => x.email === email)
    if (!m || pwdOf(email) !== pwd) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة، يرجى التحقق من بيانات الاعتماد')
    if (m.status === 'موقوف') throw new Error('هذا الحساب موقوف، يرجى التواصل مع إدارة المنصة')
    audit('تسجيل دخول تاجر: ' + m.store, 'المصادقة', 'دخول')
    return { portal: 'merchant', id: m.id, name: (m.first ? m.first + ' ' + m.last : m.store), email: m.email, role: 'تاجر', store: m.store, phone: m.phone, gender: m.gender }
  },
  async dashboard(merchantId: string) {
    await delay(300)
    const m = db.merchants.find(x => x.id === merchantId)
    if (!m) throw new Error('التاجر غير موجود')
    const orders = db.orders.filter(o => o.m === m.store)
    const wallet = db.wallets.find(w => w.m === m.store)
    const subs = db.subscriptions.filter(s => s.m === m.store && s.status === 'نشط')
    const invoices = db.invoices.filter(i => i.m === m.store)
    const pct = m.limit ? Math.round((m.used / m.limit) * 100) : 0
    return { store: m.store, storagePct: pct, storageStatus: storageStatus(m.used, m.limit), used: m.used, limit: m.limit, unit: m.unit, walletBalance: wallet?.bal ?? 0, ordersCount: orders.length, pendingOrders: orders.filter(o => o.status === 'معلق').length, activeSubs: subs.length, currentInvoice: invoices[0] ?? null, platformProducts: db.pltProducts.filter(p => p.status === 'نشط').length }
  },
  async requestOtp(email: string) {
    await delay(500)
    const m = db.merchants.find(x => x.email === email)
    if (!m) throw new Error('البريد الإلكتروني المدخل غير مرتبط بأي حساب في النظام، يرجى إدخال بريد إلكتروني صالح إلى البريد الإلكتروني المدخل')
    const code = String(Math.floor(100000 + Math.random() * 900000))
    otp = { email, code, expires: Date.now() + 10 * 60_000, resends: otp?.email === email ? otp.resends + 1 : 0 }
    audit('إرسال OTP لاسترداد كلمة مرور التاجر: ' + email + ' — مرات إعادة الإرسال: ' + otp.resends, 'المصادقة')
    return code
  },
  async verifyOtp(email: string, code: string) {
    await delay(400)
    if (!otp || otp.email !== email || Date.now() > otp.expires) throw new Error('رمز OTP غير صالح')
    if (otp.code !== code) throw new Error('رمز OTP المدخل غير صحيح')
  },
  async resetPassword(email: string, pwd: string) {
    await delay(400)
    const all = loadPwds()
    all[email] = pwd
    savePwds(all)
    otp = null
    audit('إعادة تعيين كلمة مرور التاجر عبر OTP: ' + email, 'المصادقة')
  },
  async profile(id: string) {
    await delay(250)
    const m = db.merchants.find(x => x.id === id) as (typeof db.merchants)[0] & Record<string, unknown>
    if (!m) throw new Error('التاجر غير موجود')
    return {
      name: m.first ? m.first + ' ' + m.last : m.store, email: m.email, phone: m.phone, store: m.store, gender: m.gender,
      nationalId: (m.nationalId as string) ?? '1086543210', address: (m.address as string) ?? 'RYDH2345',
      bank: (m.bank as string) ?? 'مصرف الراجحي', iban: (m.iban as string) ?? 'SA4420000001234567891234',
      notes: (m.notes as string) ?? '', attachments: (m.attachments as string[]) ?? ['سجل تجاري.pdf', 'شهادة الزكاة.jpg'],
    }
  },
  async updateProfile(id: string, patch: Record<string, unknown>) {
    await delay(400)
    const m = db.merchants.find(x => x.id === id)
    if (!m) throw new Error('التاجر غير موجود')
    Object.assign(m, patch)
    audit('تعديل الملف الشخصي للتاجر: ' + m.store, 'الملف الشخصي', 'تعديل')
  },
  async changePassword(email: string, current: string, next: string) {
    await delay(400)
    if (pwdOf(email) !== current) throw new Error('كلمة المرور الحالية غير صحيحة')
    const all = loadPwds()
    all[email] = next
    savePwds(all)
    audit('تغيير كلمة مرور التاجر: ' + email, 'الملف الشخصي')
  },
}
