import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '@/mocks/db'
import type { SessionUser } from '@/types'
const DEMO_PWD = '123456'
const ERR = { ok: false as const, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }
interface AuthState {
  user: SessionUser | null
  login: (email: string, pwd: string, portal: 'admin' | 'merchant') => { ok: boolean; error?: string }
  logout: () => void
  setUser: (user: SessionUser | null) => void
  can: (permission: string) => boolean
}
export const useAuthStore = create<AuthState>()(persist((set, get) => ({
  user: null,
  login: (email, pwd, portal) => {
    const e = email.trim().toLowerCase()
    if (portal === 'admin') {
      const a = db.admins.find(x => x.email.toLowerCase() === e) ?? (e === 'admin@daam.sa' ? db.admins[0] : undefined)
      if (!a || (pwd !== (a.pwd ?? DEMO_PWD) && pwd !== DEMO_PWD)) return ERR
      set({ user: { portal, id: a.id, name: a.name, email: a.email, role: a.role, dept: a.dept, phone: a.phone, gender: a.gender } })
      return { ok: true }
    }
    const m = db.merchants.find(x => x.email.toLowerCase() === e) ?? (e === 'merchant@daam.sa' ? db.merchants[0] : undefined)
    let stored: string | undefined
    try { stored = (JSON.parse(localStorage.getItem('daam-merchant-pwd') ?? '{}') as Record<string, string>)[e] } catch { stored = undefined }
    const expected = ((m as { pwd?: string } | undefined)?.pwd) ?? stored ?? DEMO_PWD
    if (!m || (pwd !== expected && pwd !== DEMO_PWD)) return ERR
    set({ user: { portal, id: m.id, name: m.first + ' ' + m.last, email: m.email, role: 'تاجر', store: m.store } })
    return { ok: true }
  },
  logout: () => set({ user: null }),
  setUser: (user) => set({ user }),
  can: (permission) => {
    void permission
    const u = get().user
    return !!u
  },
}), { name: 'daam-session' }))
