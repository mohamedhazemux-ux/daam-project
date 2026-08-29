import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const isAr = (i18n.language || 'ar').startsWith('ar')

  const toggle = () => {
    const nextLang = isAr ? 'en' : 'ar'
    i18n.changeLanguage(nextLang)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="h-8 gap-1.5 px-2.5 text-xs font-bold transition-all hover:bg-accent"
      title={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
      aria-label={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
    >
      <Languages className="size-3.5 text-muted-foreground" aria-hidden />
      <span>{isAr ? 'EN' : 'عربي'}</span>
    </Button>
  )
}
