import { db } from '@/mocks/db'
import { delay } from './http'
import { audit } from './audit.service'
import type { SessionUser } from '@/types'
export const DEMO_OTP = '123456'
export const authService = {
  async login(email: string, pwd: string): Promise<SessionUser> {
    await delay(500)
    const admin = db.admins.find(a => a.email === email && a.pwd === pwd)
    if (!admin) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة، يرجى التحقق من البيانات')
    audit('تسجيل دخول ناجح إلى لوحة التحكم', 'المصادقة', 'دخول')
    const rest = { ...admin }
    delete (rest as { pwd?: string }).pwd
    return { ...rest, portal: 'admin' }
  },
  async requestOtp(email: string) {
    await delay(500)
    if (!db.admins.some(a => a.email === email)) throw new Error('البريد الإلكتروني المُدخل غير مرتبط بأي حساب في النظام، يرجى إدخال بريد صحيح')
  },
  async verifyOtp(code: string) {
    await delay(400)
    if (code !== DEMO_OTP) throw new Error('رمز التحقق الذي تم إدخاله غير صحيح')
  },
  async resetPassword(email: string, pwd: string) {
    await delay(400)
    const a = db.admins.find(x => x.email === email)
    if (a) a.pwd = pwd
    audit('إعادة تعيين كلمة المرور عبر OTP', 'المصادقة')
  },
}
