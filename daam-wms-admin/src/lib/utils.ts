import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { usePrefsStore } from '@/store/prefs-store'
import { EN } from '@/lib/i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const money = (n: number) => {
  let lang = usePrefsStore.getState()?.lang
  if (!lang && typeof document !== 'undefined') {
    lang = document.documentElement.lang === 'en' || document.documentElement.getAttribute('dir') === 'ltr' ? 'en' : 'ar'
  }
  if (!lang) lang = 'ar'
  const formatted = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return lang === 'en' ? `${formatted} SAR` : `${formatted} ﷼`
}

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

export const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const MONTHS = MONTHS_AR

export const arDate = (d: string, targetLang?: string) => {
  if (!d || d === '—') return '—'
  const cleanD = String(d).split('T')[0]
  const parts = cleanD.split('-')
  if (parts.length < 3) return d
  const [y, m, dd] = parts
  const mNum = parseInt(m, 10)
  if (isNaN(mNum) || mNum < 1 || mNum > 12) return d

  let lang = targetLang || usePrefsStore.getState()?.lang
  if (!lang && typeof document !== 'undefined') {
    lang = document.documentElement.lang === 'en' || document.documentElement.getAttribute('dir') === 'ltr' ? 'en' : 'ar'
  }
  if (!lang) lang = 'ar'

  if (lang === 'en') {
    return `${parseInt(dd, 10)} ${MONTHS_EN[mNum - 1]} ${y}`
  }
  return `${parseInt(dd, 10)} ${MONTHS_AR[mNum - 1]} ${y}`
}

export const initials = (name: string) => {
  const p = name.trim().split(/\s+/)
  return (p[0]?.[0] ?? '؟') + (p[1]?.[0] ?? '')
}

export const todayISO = () => new Date().toISOString().slice(0, 10)
export const nowStamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

/** ترقيم الصفحات الذكي: 1 2 3 … 10 */
export function paginationRange(totalPages: number, current: number, siblings = 1): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const range: (number | '…')[] = [1]
  const lo = Math.max(2, current - siblings), hi = Math.min(totalPages - 1, current + siblings)
  if (lo > 2) range.push('…')
  for (let i = lo; i <= hi; i++) range.push(i)
  if (hi < totalPages - 1) range.push('…')
  range.push(totalPages)
  return range
}

/** تصدير CSV مع دعم الترجمة الفورية حسب لغة الواجهة الحالية */
export function downloadCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  // Direct store lookup, then localStorage 'daam-prefs', then document attributes
  let lang = usePrefsStore.getState()?.lang
  if (!lang) {
    try {
      const raw = localStorage.getItem('daam-prefs')
      if (raw) {
        lang = JSON.parse(raw)?.state?.lang
      }
    } catch {
      // ignore
    }
  }
  if (!lang && typeof document !== 'undefined') {
    lang = document.documentElement.lang === 'en' || document.documentElement.getAttribute('dir') === 'ltr' ? 'en' : 'ar'
  }
  if (!lang) lang = 'ar'

  const MONTHS: Record<string, string> = {
    'يناير': 'January', 'فبراير': 'February', 'مارس': 'March', 'أبريل': 'April',
    'مايو': 'May', 'يونيو': 'June', 'يوليو': 'July', 'أغسطس': 'August',
    'سبتمبر': 'September', 'أكتوبر': 'October', 'نوفمبر': 'November', 'ديسمبر': 'December'
  }

  const translate = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return ''
    if (typeof val !== 'string') return String(val)
    let str = String(val).trim()
    if (!str) return ''
    if (lang === 'en') {
      if (EN[str]) return EN[str]
      // Convert Arabic digits
      str = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      // Units and currency
      str = str.replace(/م³/g, ' m³')
      str = str.replace(/ر\.س/g, ' SAR')
      str = str.replace(/مواقع طبلية/g, ' Pallet locations')
      str = str.replace(/وحدات/g, ' Units')
      str = str.replace(/وحدة/g, ' Unit')
      str = str.replace(/قطع/g, ' Pieces')
      str = str.replace(/قطعة/g, ' Piece')
      // Months
      for (const [arM, enM] of Object.entries(MONTHS)) {
        if (str.includes(arM)) str = str.replace(new RegExp(arM, 'g'), enM)
      }
      if (EN[str.trim()]) return EN[str.trim()]
      return str
    }
    return val
  }

  const translatedHeaders = headers.map(h => translate(h))
  const translatedRows = rows.map(r => r.map(c => translate(c)))

  const csv = [translatedHeaders, ...translatedRows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const finalFilename = lang === 'en' ? (EN[filename] ?? filename) : filename
  a.download = `${finalFilename}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filename}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function downloadAttachment(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  const mime = extension === 'pdf' ? 'application/pdf' : extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : extension === 'csv' ? 'text/csv;charset=utf-8' : extension === 'txt' ? 'text/plain;charset=utf-8' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : 'application/octet-stream'
  const content = ['txt', 'csv'].includes(extension)
    ? `ملف مرفق: ${filename}\nتم تنزيل هذا الملف من نظام دعم.`
    : `بيانات تجريبية للمرفق: ${filename}`
  const blob = new Blob(['\ufeff' + content], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/** توليد كلمة مرور عشوائية */
export function generatePassword(len = 8) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghjkmnpqrstuvwxyz', '23456789', '@#$%&']
  const out: string[] = sets.map(s => s[Math.floor(Math.random() * s.length)])
  while (out.length < len) out.push(sets[Math.floor(Math.random() * 4)][Math.floor(Math.random() * 20) % 26] ?? 'x')
  return out.sort(() => Math.random() - 0.5).join('')
}

/** تحديد راوت الإشعار */
export function getNotificationRoute(notif: { title: string; msg: string; type?: string }, isMerchant: boolean): string {
  const text = (notif.title + ' ' + notif.msg).toLowerCase();
  
  if (isMerchant) {
    if (text.includes('ord-') || text.includes('طلب')) return '/merchant/orders';
    if (text.includes('sr-') || text.includes('مخزون') || text.includes('تخزين')) return '/merchant/inventory';
    if (text.includes('inv-') || text.includes('دفع') || text.includes('رصيد') || text.includes('المحفظة') || text.includes('فاتورة')) return '/merchant/wallet';
    if (text.includes('ret-') || text.includes('مرتجع') || text.includes('إرجاع')) return '/merchant/returns';
    if (text.includes('srv-') || text.includes('خدمة')) return '/merchant/services';
    return '/merchant';
  } else {
    // Admin routing
    if (text.includes('apr-') || text.includes('موافقة')) return '/approvals';
    if (text.includes('ret-') || text.includes('مرتجع') || text.includes('إرجاع')) return '/returns';
    if (text.includes('srv-') || text.includes('طلب خدمة') || text.includes('خدمة')) return '/services/requests';
    if (text.includes('sr-') || text.includes('طلب مخزون')) return '/inventory/requests';
    if (text.includes('تجاوز حد التخزين') || text.includes('سعة') || text.includes('تخزين') || text.includes('مخزون')) return '/inventory/storage';
    if (text.includes('اشتراك')) return '/services/subscriptions';
    if (text.includes('ord-') || text.includes('طلب')) return '/orders';
    return '/';
  }
}