import { useEffect } from 'react'
import { usePrefsStore } from '@/store/prefs-store'

const ARABIC = /[\u0600-\u06FF]/
const textOrigins = new WeakMap<Text, string>()
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()
const CACHE_KEY = 'daam-translation-cache-v1'

function translate(source: string) {
  const saved = cache.get(source)
  if (saved) return Promise.resolve(saved)
  const active = pending.get(source)
  if (active) return active
  const request = fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(source)}`)
    .then(async response => {
      if (!response.ok) throw new Error('Translation request failed')
      const data = await response.json() as Array<Array<[string]>>
      const translated = data[0]?.map(part => part[0]).join('').trim()
      if (!translated) throw new Error('Empty translation response')
      cache.set(source, translated)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache))) } catch { /* optional cache */ }
      return translated
    })
    .catch(() => source)
    .finally(() => pending.delete(source))
  pending.set(source, request)
  return request
}

async function translateLegacyText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let current: Node | null
  while ((current = walker.nextNode())) {
    const node = current as Text
    const parent = node.parentElement
    if (parent && !parent.closest('script, style, textarea, select, svg, [data-no-auto-translate]') && ARABIC.test(node.nodeValue ?? '')) nodes.push(node)
  }
  for (let index = 0; index < nodes.length; index += 6) {
    await Promise.all(nodes.slice(index, index + 6).map(async node => {
      const source = textOrigins.get(node) ?? node.nodeValue ?? ''
      textOrigins.set(node, source)
      const translated = await translate(source)
      if (document.documentElement.lang === 'en' && node.isConnected) node.nodeValue = translated
    }))
  }
}

function restoreLegacyText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let current: Node | null
  while ((current = walker.nextNode())) {
    const node = current as Text
    const source = textOrigins.get(node)
    if (source !== undefined) node.nodeValue = source
  }
}
export function PrefsApplier() {
  const theme = usePrefsStore(s => s.theme)
  const lang = usePrefsStore(s => s.lang)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [theme, lang])
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, string>
      Object.entries(saved).forEach(([source, translated]) => cache.set(source, translated))
    } catch { /* optional cache */ }
    const root = document.getElementById('root')
    if (!root) return
    if (lang === 'ar') { restoreLegacyText(root); return }
    void translateLegacyText(root)
    const observer = new MutationObserver(() => {
      if (document.documentElement.lang === 'en') void translateLegacyText(root)
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [lang])
  return null
}
