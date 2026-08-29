import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/tables/data-table'
import { ActionButtons, AttachmentBadgeList, FileUploadWithPreview, Modal, StatusBadge, selectCls } from '@/components/common'
import { merchantInventoryService, type StockLevelRow } from '@/services/merchant-inventory.service'
import { merchantProductsService } from '@/services/merchant-products.service'
import { useAuthStore } from '@/store/auth-store'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { downloadCSV, arDate } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Eye, Layers, PackageMinus, PackagePlus, Search } from 'lucide-react'
import type { StockRequest } from '@/types'

const statusLabel = (s: string) => (s === 'معتمد' ? 'موافق عليه' : s)

/* ---------- مستويات المخزون ---------- */
export function MerchantStockLevelsPage() {
  const t = useT()
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [op, setOp] = useState('')
  const [val, setVal] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, op, val, page, pageSize: 10, store: user?.store ?? '' }), [dq, op, val, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-levels', qp], queryFn: () => merchantInventoryService.levels(qp) })
  const { data: st } = useQuery({ queryKey: ['m-storage', user?.store], queryFn: () => merchantInventoryService.storage(user!.store!) })
  const { data: prods } = useQuery({ queryKey: ['m-prod-opts'], queryFn: () => merchantProductsService.list({ store: user?.store ?? '', page: 1, pageSize: 100 }) })
  const [modal, setModal] = useState<'' | 'إضافة' | 'سحب'>('')
  const [form, setForm] = useState({ product: '', qty: 0, notes: '', attachment: '' })
  const [fErr, setFErr] = useState('')
  const submit = useMutation({
    mutationFn: () => merchantInventoryService.submitRequest(user!.store!, modal as 'إضافة' | 'سحب', form),
    onSuccess: () => { toast.success(modal === 'إضافة' ? t('تم إرسال طلب إضافة المخزون بنجاح') : t('تم إرسال طلب سحب المخزون بنجاح')); qc.invalidateQueries({ queryKey: ['m-requests'] }); setModal('') },
  })
  const doSubmit = () => {
    if (!form.product) { setFErr(t('اسم المنتج مطلوب')); return }
    if (!form.qty && form.qty !== 0) { setFErr(t('الكمية مطلوبة')); return }
    if (form.qty < 1) { setFErr(t('يجب أن تكون الكمية أكبر من 0')); return }
    if (form.notes.length > 500) { setFErr(t('الملاحظات يجب أن تكون أقل من 500 حرف')); return }
    setFErr('')
    submit.mutate()
  }
  const columns: ColumnDef<StockLevelRow, unknown>[] = [
    { accessorKey: 'p', header: t('اسم المنتج'), cell: ({ row }) => <b>{t(row.original.p)}</b> },
    { accessorKey: 'sku', header: t('رمز المنتج'), cell: ({ row }) => <span dir="ltr">{row.original.sku}</span> },
    { accessorKey: 'avail', header: t('الكمية المتاحة'), cell: ({ row }) => <span className={row.original.avail === 0 ? 'font-black text-destructive' : row.original.avail < 25 ? 'font-black text-amber-600' : 'font-bold'}>{row.original.avail}</span> },
    { accessorKey: 'res', header: t('الكمية المحجوزة') },
    { accessorKey: 'total', header: t('الكمية الكلية'), cell: ({ row }) => <b>{row.original.total}</b> },
  ]
  return (
    <div className="space-y-4">
      {st && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <p className="text-sm font-extrabold">{t('ملخص استخدام التخزين')}</p>
            {st.status === 'تحذير' && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">{t('اقتراب حد التخزين')}</span>}
            {st.status === 'متجاوز' && <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-red-700">{t('تجاوز حد التخزين')}</span>}
          </div>
          <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"><div className={'h-full ' + (st.status === 'متجاوز' ? 'bg-destructive' : st.status === 'تحذير' ? 'bg-warning' : 'bg-foreground')} style={{ width: Math.min(100, st.pct) + '%' }} /></div>
          <p className="text-xs font-bold text-muted-foreground">{t('حد التخزين المجاني')}: <b>{st.limit} {t(st.unit)}</b> — {t('المستخدم')}: <b>{st.used} {t(st.unit)}</b> — {t('النسبة')}: <b>{st.pct}%</b> — {t('المتبقي')}: <b>{Math.max(0, st.limit - st.used)} {t(st.unit)}</b></p>
        </div>
      )}
      <div className="rounded-xl border bg-card shadow-sm">
        <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.sku}
          toolbar={
            <div className="flex flex-wrap items-center gap-2 border-b p-3">
              <div className="relative min-w-[200px] flex-1 md:max-w-xs">
                <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث باسم المنتج أو SKU...')} className="pe-9" aria-label={t('بحث في مستويات المخزون')} />
              </div>
              <select className={selectCls} value={op} onChange={e => { setOp(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الكمية المتاحة')}>
                <option value="">{t('الكمية المتاحة: الكل')}</option>
                <option value="greater">{t('أكبر من')}</option>
                <option value="less">{t('أقل من')}</option>
                <option value="equal">{t('يساوي')}</option>
              </select>
              {op && <Input type="number" className="w-24" value={val} onChange={e => { setVal(e.target.value); setPage(1) }} aria-label={t('قيمة الكمية')} />}
              <div className="ms-auto flex flex-wrap gap-2">
                 <Button size="sm" variant="outline" onClick={() => { setForm({ product: '', qty: 0, notes: '', attachment: '' }); setFErr(''); setModal('إضافة') }}><PackagePlus className="size-4" /> {t('إضافة مخزون')}</Button>
                 <Button size="sm" variant="outline" onClick={() => { setForm({ product: '', qty: 0, notes: '', attachment: '' }); setFErr(''); setModal('سحب') }}><PackageMinus className="size-4" /> {t('سحب مخزون')}</Button>
                <Button size="sm" variant="outline" onClick={() => { downloadCSV('stock-levels', ['المنتج', 'SKU', 'متاح', 'محجوز', 'كلي'], (data?.rows ?? []).map(r => [r.p, r.sku, r.avail, r.res, r.total])); toast.success(t('تم تصدير مستويات المخزون بنجاح')) }}>{t('تصدير')}</Button>
              </div>
            </div>
          } />
      </div>
      <Modal open={!!modal} onClose={() => setModal('')} title={modal === 'إضافة' ? t('إضافة مخزون') : t('سحب مخزون')}
        footer={<><Button variant="outline" onClick={() => setModal('')}>{t('إلغاء')}</Button><Button disabled={submit.isPending} onClick={doSubmit}>{t('إرسال')}</Button></>}>
        <div className="grid gap-3">
          <div><Label>{t('اسم المنتج')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}>
              <option value="">{t('اختر المنتج...')}</option>
              {(prods?.rows ?? []).map(p => <option key={p.ref} value={p.name}>{p.name}</option>)}
            </select></div>
          <div>
            <Label>{t('الكمية المطلوبة')} <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min={1}
              placeholder={t('أدخل الكمية (الحد الأدنى 1)')}
              value={form.qty || ''}
              onChange={e => {
                const v = e.target.value === '' ? 0 : Number(e.target.value)
                setForm(f => ({ ...f, qty: v }))
                if (v <= 0) setFErr(t('يرجى إدخال كمية صحيحة تبدأ من 1 أو أكثر'))
                else setFErr('')
              }}
            />
            <p className="mt-1 text-[11px] font-bold text-muted-foreground">{t('الحد الأدنى')}: <b className="text-foreground">1 {t('قطعة')}</b> — {t('يمكنك كتابة الرقم مباشرة')}</p>
          </div>
          <div><Label>{t('الملاحظات (اختياري — 500 حرف)')}</Label><Textarea maxLength={500} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div>
            <FileUploadWithPreview
              label={t('المرفقات (اختياري — PDF/PNG/JPG)')}
              files={form.attachment ? [form.attachment] : []}
              single
              onChange={files => setForm(f => ({ ...f, attachment: files[0] ?? '' }))}
            />
          </div>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
    </div>
  )
}

/* ---------- طلبات المخزون ---------- */
export function MerchantStockRequestsPage() {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, status, page, pageSize: 10, store: user?.store ?? '' }), [dq, type, status, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-requests', qp], queryFn: () => merchantInventoryService.requests(qp) })
  const [viewing, setViewing] = useState<StockRequest | null>(null)
  const columns: ColumnDef<StockRequest, unknown>[] = [
    { accessorKey: 'id', header: t('رقم الطلب'), cell: ({ row }) => <b>{row.original.id}</b> },
    { accessorKey: 'p', header: t('اسم المنتج'), cell: ({ row }) => t(row.original.p) },
    { accessorKey: 'date', header: t('التاريخ'), cell: ({ row }) => arDate(row.original.date) },
    { accessorKey: 'qty', header: t('الكمية') },
    { id: 'type', header: t('النوع'), cell: ({ row }) => <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold text-blue-700">{t(row.original.type)}</span> },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={statusLabel(row.original.status)} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض تفاصيل الطلب'), onClick: () => navigate('/merchant/records/stock-request/' + row.original.id) },
      ]} />) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث برقم الطلب أو المنتج...')} className="pe-9" aria-label={t('بحث في طلبات المخزون')} />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label={t('تصفية حسب النوع')}>
              <option value="">{t('كل الأنواع')}</option><option value="إضافة">{t('إضافة')}</option><option value="سحب">{t('سحب')}</option>
            </select>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option><option value="معلق">{t('معلق')}</option><option value="معتمد">{t('موافق عليه')}</option><option value="مرفوض">{t('مرفوض')}</option>
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('stock-requests', ['الرقم', 'المنتج', 'التاريخ', 'الكمية', 'النوع', 'الحالة'], (data?.rows ?? []).map(r => [r.id, r.p, r.date, r.qty, r.type, statusLabel(r.status)])); toast.success(t('تم تصدير طلبات المخزون بنجاح')) }}>{t('تصدير')}</Button>
          </div>
        } />
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={t('تفاصيل طلب المخزون') + ' — ' + (viewing?.id ?? '')} footer={<Button variant="outline" onClick={() => setViewing(null)}>{t('إغلاق')}</Button>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {([[t('رقم الطلب'), viewing.id], [t('المنتج'), viewing.p], [t('الكمية'), String(viewing.qty)], [t('نوع الطلب'), t(viewing.type)], [t('الحالة'), t(statusLabel(viewing.status))], [t('تاريخ الطلب'), viewing.date]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
          </div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('الملاحظات')}</p>
          <p className="mb-3 rounded-lg border bg-muted/40 p-3 text-[13px] font-bold">{viewing.notes || '—'}</p>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('المرفقات')}</p>
          <div className="mb-3">
            <AttachmentBadgeList attachments={viewing.attachment ? [viewing.attachment] : []} />
          </div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('سجل الأنشطة')}</p>
          <div className="space-y-1">
            <p className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {t('إنشاء الطلب بواسطة التاجر')} — {viewing.date}</p>
            {viewing.status !== 'معلق' && <p className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {t(statusLabel(viewing.status))} {t('بواسطة إدارة المنصة')}</p>}
          </div>
        </>}
      </Modal>
    </div>
  )
}

/* ---------- استخدام التخزين ---------- */
export function MerchantStorageUsagePage() {
  const t = useT()
  const user = useAuthStore(s => s.user)
  const { data: st, isLoading } = useQuery({ queryKey: ['m-storage', user?.store], queryFn: () => merchantInventoryService.storage(user!.store!) })

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">{t('جار التحميل...')}</div>

  return (
    <div className="space-y-4">
      {st && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black">{t('استخدام مساحة التخزين بالمستودعات')}</h2>
              <p className="text-xs text-muted-foreground">{t('متابعة الحد التخزيني المجاني ونسب الاستهلاك الحالية')}</p>
            </div>
            <div className="ms-auto">
              {st.status === 'تحذير' && <span className="rounded-md bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700">{t('اقتراب حد التخزين')}</span>}
              {st.status === 'متجاوز' && <span className="rounded-md bg-red-100 px-3 py-1 text-xs font-extrabold text-red-700">{t('تجاوز حد التخزين')}</span>}
              {st.status === 'اعتيادي' && <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">{t('معدل طبيعي')}</span>}
            </div>
          </div>

          <div className="mb-4 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>{t('نسبة الاستخدام')}: {st.pct}%</span>
              <span>{st.used} / {st.limit} {t(st.unit)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className={'h-full transition-all duration-300 ' + (st.status === 'متجاوز' ? 'bg-destructive' : st.status === 'تحذير' ? 'bg-warning' : 'bg-foreground')} style={{ width: Math.min(100, st.pct) + '%' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] font-bold text-muted-foreground">{t('حد التخزين المجاني')}</p>
              <p className="text-base font-black">{st.limit} {t(st.unit)}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] font-bold text-muted-foreground">{t('المستخدم حاليًا')}</p>
              <p className="text-base font-black">{st.used} {t(st.unit)}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] font-bold text-muted-foreground">{t('المساحة المتبقية')}</p>
              <p className="text-base font-black">{Math.max(0, st.limit - st.used)} {t(st.unit)}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-[11px] font-bold text-muted-foreground">{t('حالة المساحة')}</p>
              <p className="text-base font-black">{t(st.status)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MerchantInventoryPage() {
  return <MerchantStockLevelsPage />
}

