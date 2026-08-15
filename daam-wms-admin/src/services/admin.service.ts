import { db } from '@/mocks/db'
import { delay } from './http'
import { audit } from './audit.service'
export const adminService = {
  async changePassword(current: string, next: string) {
    await delay(400)
    const a = db.admins[0]
    if (a.pwd !== current) throw new Error('كلمة المرور الحالية غير صحيحة')
    a.pwd = next
    audit('تغيير كلمة مرور المدير', 'الملف الشخصي')
  },
  async updateProfile(patch: Partial<(typeof db.admins)[0]>) {
    await delay(400)
    Object.assign(db.admins[0], patch)
    audit('تعديل الملف الشخصي', 'الملف الشخصي', 'تعديل')
  },
}
