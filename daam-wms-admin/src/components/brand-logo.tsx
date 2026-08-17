import { useState } from 'react'
import { usePrefsStore } from '@/store/prefs-store'
export function BrandLogo({ className, variant }: { className?: string; variant?: 'light' | 'dark' }) {
  const theme = usePrefsStore(s => s.theme)
  const [broken, setBroken] = useState(false)
  const want = variant ?? (theme === 'dark' ? 'light' : 'dark')
  const src = broken ? '/logo-' + want + '.svg' : '/logo-' + want + '.png'
  return <img src={src} onError={() => setBroken(true)} alt="Leading Support" className={className ?? 'h-12 w-auto'} />
}
