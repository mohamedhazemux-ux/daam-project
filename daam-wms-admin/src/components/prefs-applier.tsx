import { useEffect } from 'react'
import { usePrefsStore } from '@/store/prefs-store'
export function PrefsApplier() {
  const theme = usePrefsStore(s => s.theme)
  const lang = usePrefsStore(s => s.lang)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [theme, lang])
  return null
}
