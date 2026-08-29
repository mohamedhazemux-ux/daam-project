import { useTranslation as useReactI18n } from 'react-i18next'
import i18n from '@/i18n'
import { usePrefsStore } from '@/store/prefs-store'
import arDict from '@/locales/ar.json'
import enDict from '@/locales/en.json'

export const AR: Record<string, string> = arDict as Record<string, string>
export const EN: Record<string, string> = enDict as Record<string, string>

// مزامنة حالة المتجر (Zustand) مع i18next
usePrefsStore.subscribe((state) => {
  if (i18n.language !== state.lang) {
    i18n.changeLanguage(state.lang)
  }
})

// مزامنة i18next مع حالة المتجر (Zustand)
i18n.on('languageChanged', (lng) => {
  const currentLang = lng.startsWith('ar') ? 'ar' : 'en'
  const storeLang = usePrefsStore.getState().lang
  if (storeLang !== currentLang) {
    usePrefsStore.getState().setLang(currentLang)
  }
})

function resolveTranslation(key: string, dict: Record<string, string>): string {
  if (!key) return ''
  if (typeof dict[key] === 'string') {
    return dict[key]
  }

  // Handle compound strings separated by ' — ' (em dash or en dash)
  if (key.includes(' — ')) {
    const parts = key.split(' — ')
    const translatedParts = parts.map(p => {
      const trimmed = p.trim()
      return dict[trimmed] ?? trimmed
    })
    return translatedParts.join(' — ')
  }

  // Handle compound strings separated by ' - '
  if (key.includes(' - ')) {
    const parts = key.split(' - ')
    const translatedParts = parts.map(p => {
      const trimmed = p.trim()
      return dict[trimmed] ?? trimmed
    })
    return translatedParts.join(' - ')
  }

  // Handle bullet list items starting with '• '
  if (key.startsWith('• ')) {
    const rest = key.slice(2).trim()
    return '• ' + resolveTranslation(rest, dict)
  }

  return key
}

/**
 * دالة الترجمة المباشرة المتزامنة
 */
export function translate(key: string, lang?: 'ar' | 'en'): string {
  if (!key) return ''
  const currentLang = lang || (i18n.language?.startsWith('ar') ? 'ar' : 'en')
  const dict = currentLang === 'ar' ? AR : EN
  const resolved = resolveTranslation(key, dict)
  if (resolved !== key) return resolved
  return i18n.t(key, { defaultValue: key })
}

/**
 * الخطاف الأساسي للترجمة الفورية المباشرة في المكونات
 */
export function useT() {
  const { t } = useReactI18n()
  const lang = usePrefsStore(s => s.lang)

  return (key: string, defaultValue?: string) => {
    if (!key) return ''
    const dict = lang === 'ar' ? AR : EN
    if (dict) {
      const resolved = resolveTranslation(key, dict)
      if (resolved !== key) {
        return resolved
      }
    }
    return t(key, defaultValue ?? key)
  }
}

/**
 * خطاف useTranslation الرسمي من react-i18next مع توافق تام
 */
export function useTranslation() {
  const res = useReactI18n()
  const setLang = usePrefsStore(s => s.setLang)

  return {
    ...res,
    t: (key: string, defaultValue?: string) => {
      if (!key) return ''
      const lang = res.i18n.language?.startsWith('ar') ? 'ar' : 'en'
      const dict = lang === 'ar' ? AR : EN
      if (dict) {
        const resolved = resolveTranslation(key, dict)
        if (resolved !== key) return resolved
      }
      return res.t(key, defaultValue ?? key)
    },
    i18n: {
      ...res.i18n,
      changeLanguage: async (lng: string) => {
        const standardLng = lng.startsWith('ar') ? 'ar' : 'en'
        setLang(standardLng)
        return res.i18n.changeLanguage(standardLng)
      }
    }
  }
}

export default useTranslation
