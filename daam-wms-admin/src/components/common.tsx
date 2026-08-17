import { useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Inbox, X, type LucideIcon } from 'lucide-react'

export const selectCls = 'h-9 rounded-md border border-input bg-background px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring'

const MAP: Record<string, string> = {
  'نشط': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'موقوف': 'bg-red-50 text-red-700 border-red-200',
  'منضم': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'غير منضم بعد': 'bg-amber-50 text-amber-700 border-amber-200',
  'معلق': 'bg-amber-50 text-amber-700 border-amber-200',
  'معتمد': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'مرفوض': 'bg-red-50 text-red-700 border-red-200',
  'في الطريق': 'bg-blue-50 text-blue-700 border-blue-200',
  'مستلم': 'bg-violet-50 text-violet-700 border-violet-200',
  'تم الفحص': 'bg-blue-50 text-blue-700 border-blue-200',
  'تم الاسترداد': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'ملغي': 'bg-slate-100 text-slate-600 border-slate-200',
  'قيد المعالجة': 'bg-blue-50 text-blue-700 border-blue-200',
  'مكتمل': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'قيد التنفيذ': 'bg-blue-50 text-blue-700 border-blue-200',
  'مرسلة': 'bg-blue-50 text-blue-700 border-blue-200',
  'تم الإنشاء': 'bg-slate-100 text-slate-600 border-slate-200',
  'مستعرضة': 'bg-violet-50 text-violet-700 border-violet-200',
  'متأخرة': 'bg-red-50 text-red-700 border-red-200',
  'مدفوعة': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'فشل الدفع': 'bg-red-50 text-red-700 border-red-200',
  'منصة': 'bg-slate-900 text-white border-slate-900',
  'ذاتي': 'bg-slate-100 text-slate-600 border-slate-300',
  'عادي': 'bg-slate-100 text-slate-600 border-slate-200',
  'عاجل': 'bg-amber-50 text-amber-700 border-amber-200',
  'حرج': 'bg-red-50 text-red-700 border-red-200',
  'إضافة': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'سحب': 'bg-amber-50 text-amber-700 border-amber-200',
  'متكرر': 'bg-violet-50 text-violet-700 border-violet-200',
  'دفعة واحدة': 'bg-slate-100 text-slate-600 border-slate-200',
  'مجمّد': 'bg-blue-50 text-blue-700 border-blue-200',
  'اعتيادي': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'تحذير': 'bg-amber-50 text-amber-700 border-amber-200',
  'متجاوز': 'bg-red-50 text-red-700 border-red-200',
  'غير نشط': 'bg-slate-100 text-slate-600 border-slate-200',
  'يعمل': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'متدهور': 'bg-amber-50 text-amber-700 border-amber-200',
  'نجاح': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'موافقة': 'bg-violet-50 text-violet-700 border-violet-200',
  'تنبيه': 'bg-blue-50 text-blue-700 border-blue-200',
  'معلومات': 'bg-slate-100 text-slate-600 border-slate-200',
  'جاري الشحن': 'bg-blue-50 text-blue-700 border-blue-200',
  'ارجاع': 'bg-red-50 text-red-700 border-red-200',
  'مرتجع': 'bg-red-50 text-red-700 border-red-200',
}

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const t = useT()
  const label = t(value)
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-bold', MAP[value] ?? 'bg-slate-100 text-slate-600 border-slate-200', className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </Badge>
  )
}

export function EmptyState({ icon: Icon = Inbox, title = 'لا توجد بيانات', desc }: { icon?: LucideIcon; title?: string; desc?: string }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center" role="status">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted"><Icon className="size-6 text-muted-foreground" /></div>
      <p className="text-sm font-bold">{t(title)}</p>
      {desc && <p className="max-w-sm text-xs text-muted-foreground">{t(desc)}</p>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  const t = useT()
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const active = document.activeElement as HTMLElement | null
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
    requestAnimationFrame(() => (focusable()[0] ?? dialogRef.current)?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const items = focusable()
      if (!items.length) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; active?.focus() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={dialogRef} tabIndex={-1} className={cn('mx-auto my-8 w-full rounded-2xl border bg-card shadow-2xl animate-fade-up', wide ? 'max-w-3xl' : 'max-w-md')}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-[15px] font-extrabold">{title}</h3>
          <button className="inline-flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent" onClick={onClose} aria-label={t('إغلاق')}><X className="size-4" /></button>
        </div>
        <div className="modal-body max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-start gap-2 border-t px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'تأكيد', destructive, loading, onConfirm }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t('إلغاء')}</Button>
        <Button variant={destructive ? 'destructive' : 'default'} disabled={loading} onClick={onConfirm}>{loading ? t('جارٍ التنفيذ...') : t(confirmLabel)}</Button>
      </>}
    >
      {description && <div className="text-sm font-semibold leading-7">{description}</div>}
    </Modal>
  )
}

export function LineChart({ data, height = 220 }: { data: number[]; height?: number }) {
  if (!data.length) return <EmptyState title="لا توجد بيانات للعرض" />
  const w = 640
  const max = Math.max(...data)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - (v / max) * (height - 18) - 6] as const)
  const line = pts.map(p => p.join(',')).join(' ')
  return (
    <svg viewBox={'0 0 ' + w + ' ' + height} className="h-auto w-full" role="img" aria-label="رسم بياني خطي">
      <defs>
        <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0a" stopOpacity=".14" />
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={'0,' + height + ' ' + line + ' ' + w + ',' + height} fill="url(#lc)" />
      <polyline points={line} fill="none" stroke="#0a0a0a" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return <EmptyState title="لا توجد بيانات للعرض" />
  const P = (a: number) => [50 + 38 * Math.cos(((a - 90) * Math.PI) / 180), 50 + 38 * Math.sin(((a - 90) * Math.PI) / 180)] as const
  const slices = data.reduce<Array<{ label: string; color: string; from: number; to: number }>>((acc, item) => {
    const start = acc.length ? acc[acc.length - 1].to : 0
    const from = (start / total) * 360
    const to = ((start + item.value) / total) * 360
    acc.push({ label: item.label, color: item.color, from, to })
    return acc
  }, [])
  const arcs = slices.map(slice => {
    const [sx, sy] = P(slice.from)
    const [ex, ey] = P(slice.to - 0.8)
    return <path key={slice.label} d={'M' + sx + ' ' + sy + ' A38 38 0 ' + (slice.to - slice.from > 180 ? 1 : 0) + ' 1 ' + ex + ' ' + ey} fill="none" stroke={slice.color} strokeWidth="13" />
  })
  return (
    <svg viewBox="0 0 100 100" className="size-40" role="img" aria-label="توزيع الحالات">
      {arcs}
      <text x="50" y="48" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0a0a0a">{total}</text>
      <text x="50" y="61" textAnchor="middle" fontSize="7" fill="#71717a" fontWeight="700">إجمالي</text>
    </svg>
  )
}

export function HBarChart({ data, unit }: { data: { label: string; value: number }[]; unit?: string }) {
  if (!data.length) return <EmptyState title="لا توجد بيانات للعرض" />
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="space-y-2.5">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-2.5">
          <span className="w-36 truncate text-xs font-bold" title={d.label}>{d.label}</span>
          <div className="flex h-5 flex-1 overflow-hidden rounded-md bg-muted">
            <div className="h-full rounded-md bg-foreground transition-all duration-500" style={{ width: (d.value / max) * 100 + '%' }} />
          </div>
          <span className="w-12 text-xs font-extrabold">{d.value}{unit ?? ''}</span>
        </div>
      ))}
    </div>
  )
}
