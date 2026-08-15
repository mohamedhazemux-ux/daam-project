import { create } from 'zustand'
import { persist } from 'zustand/middleware'
interface PrefsState { theme: 'light' | 'dark'; lang: 'ar' | 'en'; setTheme: (t: 'light' | 'dark') => void; setLang: (l: 'ar' | 'en') => void }
export const usePrefsStore = create<PrefsState>()(persist((set) => ({
  theme: 'light', lang: 'ar',
  setTheme: theme => set({ theme }),
  setLang: lang => set({ lang }),
}), { name: 'daam-prefs' }))
