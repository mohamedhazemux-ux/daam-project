import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Inbox, X, Download, Eye, FileText, Image, type LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentViewer — عارض ومنزّل المرفقات (صور + PDF)
// الاستخدام:
//   <AttachmentViewer files={['invoice.pdf', 'photo.jpg']} />
//   <AttachmentViewer files={files} baseUrl="/api/attachments" />
// ─────────────────────────────────────────────────────────────────────────────
function isImage(name: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name) }
function isPdf(name: string) { return /\.pdf$/i.test(name) }

export function AttachmentViewer({ files, baseUrl = '#', label }: { files: string[]; baseUrl?: string; label?: string }) {
  const t = useT()
  const [preview, setPreview] = useState<string | null>(null)
  if (!files.length) return <p className="text-[12px] font-bold text-muted-foreground">{label ?? t('لا توجد مرفقات')}</p>
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => {
          const img = isImage(f)
          const pdf = isPdf(f)
          return (
            <div key={i} className="flex items-center gap-1 rounded-lg border bg-muted/40 px-2 py-1.5">
              {img ? <Image className="size-4 shrink-0 text-blue-500" aria-hidden /> : pdf ? <FileText className="size-4 shrink-0 text-red-500" aria-hidden /> : <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
              <span className="max-w-[160px] truncate text-[12px] font-bold" title={f}>{f}</span>
              <button
                onClick={() => setPreview(f)}
                className="ms-1 inline-flex size-6 items-center justify-center rounded-md hover:bg-accent"
                aria-label={t('عرض') + ' ' + f}
                title={t('عرض')}
              ><Eye className="size-3.5" /></button>
              <a
                href={baseUrl !== '#' ? `${baseUrl}/${encodeURIComponent(f)}` : '#'}
                download={f}
                onClick={baseUrl === '#' ? (e) => { e.preventDefault(); setPreview(f) } : undefined}
                className="inline-flex size-6 items-center justify-center rounded-md hover:bg-accent"
                aria-label={t('تنزيل') + ' ' + f}
                title={t('تنزيل')}
              ><Download className="size-3.5" /></a>
            </div>
          )
        })}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t('عارض المرفقات')}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPreview(null) }}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="max-w-[400px] truncate text-[13px] font-extrabold" dir="ltr">{preview}</p>
              <div className="flex items-center gap-2">
                <a
                  href={baseUrl !== '#' ? `${baseUrl}/${encodeURIComponent(preview)}` : '#'}
                  download={preview}
                  onClick={baseUrl === '#' ? (e) => e.preventDefault() : undefined}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-bold hover:bg-accent"
                ><Download className="size-3.5" /> {t('تنزيل')}</a>
                <button onClick={() => setPreview(null)} className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-accent" aria-label={t('إغلاق')}><X className="size-4" /></button>
              </div>
            </div>
            <div className="p-4">
              {isImage(preview) && <img src={baseUrl !== '#' ? `${baseUrl}/${encodeURIComponent(preview)}` : 'https://placehold.co/800x500/f4f4f5/71717a?text=' + encodeURIComponent(preview)} alt={preview} className="max-h-[70vh] w-auto rounded-lg" />}
              {isPdf(preview) && baseUrl !== '#' && <iframe src={`${baseUrl}/${encodeURIComponent(preview)}`} className="h-[70vh] w-[60vw] rounded-lg border" title={preview} />}
              {isPdf(preview) && baseUrl === '#' && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <FileText className="size-16 text-red-400" aria-hidden />
                  <p className="text-sm font-bold text-muted-foreground">{preview}</p>
                  <p className="text-[12px] text-muted-foreground">{t('فتح في نافذة جديدة')}</p>
                </div>
              )}
              {!isImage(preview) && !isPdf(preview) && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <FileText className="size-16 text-muted-foreground" aria-hidden />
                  <p className="text-sm font-bold">{preview}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// File Object URL Cache for Live Previews
// ─────────────────────────────────────────────────────────────────────────────
export const fileObjectUrlMap = new Map<string, string>()

export function getAttachmentUrl(name: string): string | null {
  if (!name) return null
  if (/^(blob:|data:|https?:\/\/)/.test(name)) return name
  if (fileObjectUrlMap.has(name)) return fileObjectUrlMap.get(name)!
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentViewerModal — نافذة معاينة المرفقات العامة
// ─────────────────────────────────────────────────────────────────────────────
export function AttachmentViewerModal({
  file,
  onClose,
}: {
  file: string | null
  onClose: () => void
}) {
  const t = useT()
  if (!file) return null

  const fileUrl = getAttachmentUrl(file)
  const img = isImage(file)
  const pdf = isPdf(file)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[92vh] max-w-4xl w-full overflow-auto rounded-2xl border bg-card p-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {img ? <Image className="size-5 text-blue-500 shrink-0" /> : pdf ? <FileText className="size-5 text-red-500 shrink-0" /> : <FileText className="size-5 text-muted-foreground shrink-0" />}
            <p className="font-extrabold text-sm truncate" dir="ltr" title={file}>{file}</p>
          </div>
          <div className="flex items-center gap-2">
            {fileUrl && (
              <a
                href={fileUrl}
                download={file}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-accent"
              >
                <Download className="size-3.5" /> {t('تنزيل')}
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-56 p-4 bg-muted/20 rounded-xl">
          {img ? (
            <img
              src={fileUrl || ('https://placehold.co/800x500/f4f4f5/71717a?text=' + encodeURIComponent(file))}
              alt={file}
              className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
            />
          ) : pdf ? (
            fileUrl ? (
              <iframe src={fileUrl} className="h-[68vh] w-full rounded-lg border bg-white" title={file} />
            ) : (
              <div className="flex flex-col items-center gap-3 text-center py-10">
                <FileText className="size-16 text-red-500" />
                <p className="text-sm font-bold" dir="ltr">{file}</p>
                <span className="text-xs text-muted-foreground">{t('مستند PDF')}</span>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-3 text-center py-10">
              <FileText className="size-16 text-muted-foreground" />
              <p className="text-sm font-bold" dir="ltr">{file}</p>
              <span className="text-xs text-muted-foreground">{t('مستند')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentBadgeList — عرض المرفقات مع أزرار المعاينة التفاعلية
// ─────────────────────────────────────────────────────────────────────────────
export function AttachmentBadgeList({
  attachments = [],
  emptyText = 'لا توجد مرفقات مرتبطة بهذا السجل.',
}: {
  attachments?: string[]
  emptyText?: string
}) {
  const t = useT()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const list = attachments.filter(Boolean)

  if (list.length === 0) {
    return <span className="text-sm text-muted-foreground">{t(emptyText)}</span>
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {list.map((item, idx) => {
          const img = isImage(item)
          const pdf = isPdf(item)
          const fileUrl = getAttachmentUrl(item)
          return (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs shadow-sm"
            >
              {img ? <Image className="size-3.5 text-blue-500" /> : pdf ? <FileText className="size-3.5 text-red-500" /> : <FileText className="size-3.5 text-muted-foreground" />}
              <span className="font-bold text-foreground max-w-[180px] truncate" dir="ltr" title={item}>{item}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(item)}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-extrabold hover:bg-accent text-foreground transition-colors"
              >
                <Eye className="size-3" /> {t('معاينة')}
              </button>
              {fileUrl && (
                <a
                  href={fileUrl}
                  download={item}
                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-extrabold hover:bg-accent text-foreground transition-colors"
                >
                  <Download className="size-3" />
                </a>
              )}
            </div>
          )
        })}
      </div>

      <AttachmentViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FileUploadWithPreview — رفع المرفقات مع المعاينة الفورية والحذف
// ─────────────────────────────────────────────────────────────────────────────
export function FileUploadWithPreview({
  files = [],
  onChange,
  accept = '.pdf,.png,.jpg,.jpeg,.webp',
  maxFiles = 5,
  maxSizeMB = 10,
  label,
  helperText,
  disabled = false,
  single = false,
}: {
  files: string[]
  onChange: (files: string[]) => void
  accept?: string
  maxFiles?: number
  maxSizeMB?: number
  label?: string
  helperText?: string
  disabled?: boolean
  single?: boolean
}) {
  const t = useT()
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return
    const incoming = Array.from(fileList)
    const validNames: string[] = []

    for (const f of incoming) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        continue
      }
      validNames.push(f.name)
      try {
        const objUrl = URL.createObjectURL(f)
        fileObjectUrlMap.set(f.name, objUrl)
      } catch {
        // Fallback if URL.createObjectURL fails
      }
    }

    if (single) {
      onChange(validNames.slice(0, 1))
    } else {
      const combined = [...new Set([...files, ...validNames])].slice(0, maxFiles)
      onChange(combined)
    }
  }

  const removeFile = (name: string) => {
    onChange(files.filter(f => f !== name))
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-bold text-muted-foreground">{t(label)}</p>}
      
      {/* Upload Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:bg-muted/40',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={!single}
          disabled={disabled}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2">
          <FileText className="size-5" />
        </div>
        <p className="text-xs font-bold">{t('اضغط هنا لرفع الملفات أو اسحبها وأفلتها هنا')}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {helperText ? t(helperText) : `${t('الحد الأقصى:')} ${maxFiles} ${t('ملفات')} (${accept.replace(/\./g, '').toUpperCase()}) ${t('حتى')} ${maxSizeMB}MB`}
        </p>
      </div>

      {/* Uploaded Files Preview List */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {files.map((file, idx) => {
            const img = isImage(file)
            const pdf = isPdf(file)
            const fileUrl = getAttachmentUrl(file)
            return (
              <div
                key={idx}
                className="group relative flex items-center gap-2 rounded-lg border bg-card p-2 text-xs shadow-sm transition-all hover:shadow"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted overflow-hidden">
                  {img && fileUrl ? (
                    <img src={fileUrl} alt={file} className="size-full object-cover rounded" />
                  ) : img ? (
                    <Image className="size-4 text-blue-500" />
                  ) : pdf ? (
                    <FileText className="size-4 text-red-500" />
                  ) : (
                    <FileText className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 max-w-[150px]">
                  <p className="truncate font-bold" dir="ltr" title={file}>{file}</p>
                  <p className="text-[10px] text-muted-foreground">{img ? t('صورة') : pdf ? 'PDF' : t('مستند')}</p>
                </div>
                <div className="flex items-center gap-1 ms-1">
                  <button
                    type="button"
                    onClick={() => setPreview(file)}
                    className="inline-flex size-6 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    title={t('معاينة')}
                  >
                    <Eye className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className="inline-flex size-6 items-center justify-center rounded hover:bg-destructive/10 text-destructive"
                    title={t('حذف')}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Live Preview Modal */}
      <AttachmentViewerModal file={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionButtons — أزرار إجراءات موحّدة بأيقونات + tooltip
// الاستخدام:
//   <ActionButtons actions={[
//     { icon: Eye, label: 'عرض', onClick: () => ... },
//     { icon: Pencil, label: 'تعديل', onClick: () => ... },
//     { icon: Trash2, label: 'حذف', variant: 'destructive', onClick: () => ... },
//   ]} />
// ─────────────────────────────────────────────────────────────────────────────
export interface ActionItem {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'destructive' | 'ghost'
  disabled?: boolean
  hidden?: boolean
}

export function ActionButtons({ actions, maxVisible = 10 }: { actions: ActionItem[]; maxVisible?: number }) {
  const t = useT()
  const visible = actions.filter(a => !a.hidden)
  return (
    <div className="flex items-center gap-1">
      {visible.slice(0, maxVisible).map((a, i) => (
        <div key={i} className="group relative">
          <button
            type="button"
            disabled={a.disabled}
            onClick={e => {
              e.stopPropagation()
              a.onClick()
            }}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-md border text-xs transition-colors',
              a.variant === 'destructive'
                ? 'border-transparent text-destructive hover:bg-destructive/10 disabled:opacity-40'
                : 'border-input bg-card hover:bg-accent hover:text-accent-foreground disabled:opacity-40'
            )}
            aria-label={t(a.label)}
            title={t(a.label)}
          >
            <a.icon className="size-4" aria-hidden />
          </button>
          {/* Tooltip */}
          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-0.5 text-[11px] font-bold text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100">
            {t(a.label)}
          </span>
        </div>
      ))}
    </div>
  )
}

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
  'قيد التنفيذ': 'bg-blue-50 text-blue-700 border-blue-200',
  'قيد التغليف': 'bg-purple-50 text-purple-700 border-purple-200',
  'جاهز للاستلام': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'قيد التوصيل': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'مكتمل': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'مرسلة': 'bg-blue-50 text-blue-700 border-blue-200',
  'تم الإنشاء': 'bg-slate-100 text-slate-600 border-slate-200',
  'مستعرضة': 'bg-violet-50 text-violet-700 border-violet-200',
  'متأخرة': 'bg-red-50 text-red-700 border-red-200',
  'مدفوعة': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'فشل الدفع': 'bg-red-50 text-red-700 border-red-200',
  'منصة': 'bg-slate-900 text-white border-slate-900',
  'شحن المنصة': 'bg-slate-900 text-white border-slate-900',
  'شحن المنصة الداعمة': 'bg-slate-900 text-white border-slate-900',
  'ذاتي': 'bg-slate-100 text-slate-600 border-slate-300',
  'الشحن الذاتي': 'bg-slate-100 text-slate-600 border-slate-300',
  'شحن ذاتي': 'bg-slate-100 text-slate-600 border-slate-300',
  'الشحن القياسي': 'bg-blue-50 text-blue-700 border-blue-200',
  'الشحن السريع': 'bg-amber-50 text-amber-700 border-amber-200',
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
  'معطل': 'bg-slate-100 text-slate-600 border-slate-200',
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
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const active = document.activeElement as HTMLElement | null
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])

    if (!dialogRef.current?.contains(document.activeElement)) {
      requestAnimationFrame(() => {
        if (!dialogRef.current?.contains(document.activeElement)) {
          (focusable()[0] ?? dialogRef.current)?.focus()
        }
      })
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key !== 'Tab') return
      const items = focusable()
      if (!items.length) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (active && document.body.contains(active)) {
        active.focus()
      }
    }
  }, [open])

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
          <h3 className="text-[15px] font-extrabold">{t(title)}</h3>
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
  const t = useT()
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
      <text x="50" y="61" textAnchor="middle" fontSize="7" fill="#71717a" fontWeight="700">{t('إجمالي')}</text>
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

/**
 * أيقونة ورمز عملة الريال السعودي الرسمي الجديد (SAMA Saudi Riyal Official Symbol)
 */
export function SaudiRiyalSymbol({ className = 'size-3.5 inline-block align-middle' }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center justify-center font-bold', className)} title="SAR / ﷼" aria-label="ريال سعودي">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-full"
      >
        <path d="M6 5c0 5 3 9 8 9.5" />
        <path d="M14 14.5v4.5" />
        <path d="M5 8.5h14" />
        <path d="M5 12h14" />
      </svg>
    </span>
  )
}

/**
 * مكون عرض الأسعار مع رمز عملة الريال السعودي
 */
export function MoneyDisplay({ value, className }: { value: number; className?: string }) {
  const formatted = Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <span className={cn('inline-flex items-center gap-1 font-bold', className)}>
      <span>{formatted}</span>
      <span className="font-extrabold text-[1.1em] text-foreground/80 leading-none" title="ريال سعودي">﷼</span>
    </span>
  )
}
