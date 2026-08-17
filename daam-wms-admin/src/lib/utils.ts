// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const money = (n: number) =>
  `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`

export const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

export const arDate = (d: string) => {
  if (!d || d === '—') return '—'
  const [y, m, dd] = d.split('-')
  return `${+dd} ${MONTHS[+m - 1]} ${y}`
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

/** تصدير CSV */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filename}.csv`
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