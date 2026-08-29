import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import arTranslation from './locales/ar.json'
import enTranslation from './locales/en.json'

const resources = {
  en: {
    translation: enTranslation
  },
  ar: {
    translation: arTranslation
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

// تحديث اتجاه الصفحة (RTL/LTR) تلقائياً عند تغيير اللغة
i18n.on('languageChanged', (lng) => {
  const isAr = lng.startsWith('ar')
  document.dir = isAr ? 'rtl' : 'ltr'
  document.documentElement.lang = isAr ? 'ar' : 'en'
})

// إعداد الاتجاه الأولي
if (typeof document !== 'undefined') {
  const currentLng = i18n.language || 'ar'
  const isAr = currentLng.startsWith('ar')
  document.dir = isAr ? 'rtl' : 'ltr'
  document.documentElement.lang = isAr ? 'ar' : 'en'
}

export default i18n
