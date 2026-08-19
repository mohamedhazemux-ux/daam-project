import { db } from '@/mocks/db'
import { delay } from './http'
import { audit } from './audit.service'
import { useAuthStore } from '@/store/auth-store'

export const adminService = {
  async changePassword(current: string, next: string) {
    await delay(400)
    const userId = useAuthStore.getState().user?.id
    const a = db.admins.find(x => x.id === userId) ?? db.admins[0]
    if (a.pwd !== current) throw new Error('كلمة المرور الحالية غير صحيحة')
    a.pwd = next
    audit('تغيير كلمة مرور المدير', 'الملف الشخصي')
  },
  async updateProfile(patch: Partial<(typeof db.admins)[0]>) {
    await delay(400)
    const userId = useAuthStore.getState().user?.id
    const a = db.admins.find(x => x.id === userId) ?? db.admins[0]
    Object.assign(a, patch)
    audit('تعديل الملف الشخصي', 'الملف الشخصي', 'تعديل')
  },
}
