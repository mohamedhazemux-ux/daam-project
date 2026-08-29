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
import { ActionButtons, ConfirmDialog, Modal, StatusBadge, selectCls } from '@/components/common'
import { inventoryService } from '@/services/inventory.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV } from '@/lib/utils'
import type { Merchant, StockLevel, StockRequest } from '@/types'
import { CheckCircle, Eye, Search, XCircle } from 'lucide-react'
import { useT } from '@/lib/i18n'

/* ---------- طلبات المخزون المعلقة ---------- */
export function StockRequestsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const t = useT()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, status: 'معلق', page, pageSize: 10 }), [dq, type, page])
  const { data, isLoading } = useQuery({ queryKey: ['stock-requests', qp], queryFn: () => inventoryService.requests(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['stock-requests'] })

  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [rErr, setRErr] = useState('')

  const approve = useMutation({ mutationFn: (id: string) => inventoryService.approveRequest(id), onSuccess: () => { toast.success(t('تمت الموافقة على طلب المخزون بنجاح')); invalidate(); setApproving(null) } })
  const reject = useMutation({ mutationFn: (v: { id: string; reason: string }) => inventoryService.rejectRequest(v.id, v.reason), onSuccess: () => { toast.success(t('تم رفض طلب المخزون بنجاح')); invalidate(); setRejecting(null) } })

  const columns: ColumnDef<StockRequest, unknown>[] = [
    { accessorKey: 'id', header: t('رقم الطلب'), cell: ({ row }) => <b>{row.original.id}</b> },
    { id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },
    { id: 'p', header: t('المنتج'), cell: ({ row }) => t(row.original.p) },
    { id: 'wh', header: t('المستودع'), cell: ({ row }) => t(row.original.wh) },
    { accessorKey: 'qty', header: t('الكمية') },
    { id: 'type', header: t('النوع'), cell: ({ row }) => <StatusBadge value={row.original.type} /> },
    { id: 'date', header: t('تاريخ الطلب'), cell: ({ row }) => arDate(row.original.date) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض التفاصيل'), onClick: () => navigate(`/records/stock-request/${row.original.id}`) },
        { icon: CheckCircle, label: t('اعتماد الطلب'), onClick: () => setApproving(row.original.id) },
        { icon: XCircle, label: t('رفض الطلب'), variant: 'destructive', onClick: () => { setRejecting(row.original.id); setReason(''); setRErr('') } },
      ]} />) },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث برقم الطلب أو اسم التاجر...')} className="pe-9" aria-label={t('بحث في طلبات المخزون')} />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label={t('تصفية حسب النوع')}>
              <option value="">{t('كل الأنواع')}</option>
              <option value="إضافة">{t('إضافة')}</option>
              <option value="سحب">{t('سحب')}</option>
            </select>
            <span className="ms-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">{data?.total ?? 0} {t('طلب معلق')}</span>
          </div>
        } />

      <ConfirmDialog open={!!approving} onOpenChange={v => { if (!v) setApproving(null) }} title={t('اعتماد طلب المخزون')} loading={approve.isPending}
        description={t('هل أنت متأكد من اعتماد طلب المخزون') + ' ' + (approving ?? '') + '؟ ' + t('سيتم تحديث مستويات المخزون في النظام فور الاعتماد.')}
        confirmLabel={t('اعتماد')} onConfirm={() => approve.mutate(approving!)} />

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={t('رفض طلب المخزون') + ' — ' + (rejecting ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>{t('إلغاء')}</Button>
          <Button variant="destructive" disabled={reject.isPending} onClick={() => {
            const r = reason.trim()
            if (!r) { setRErr(t('سبب الرفض مطلوب')); return }
            if (r.length < 10 || r.length > 500) { setRErr(t('يجب أن يكون سبب الرفض بين 10 و 500 حرف')); return }
            setRErr('')
            reject.mutate({ id: rejecting!, reason: r })
          }}>{t('تأكيد الرفض')}</Button>
        </>}>
        <Label>{t('سبب الرفض')} <span className="text-destructive">*</span> (10 – 500 {t('حرف')})</Label>
        <Textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} placeholder={t('اشرح سبب رفض الطلب...')} />
        {rErr && <p className="mt-1 text-xs font-bold text-destructive">{rErr}</p>}
      </Modal>
    </div>
  )
}

/* ---------- مستويات المخزون ---------- */
export function StockLevelsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [q, setQ] = useState('')
  const [wh, setWh] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, wh, page, pageSize: 10 }), [dq, wh, page])
  const { data, isLoading } = useQuery({ queryKey: ['stock-levels', qp], queryFn: () => inventoryService.levels(qp) })
  const { data: opts } = useQuery({ queryKey: ['inventory-options'], queryFn: () => inventoryService.options() })

  const [modal, setModal] = useState<'' | 'adjust' | 'transfer' | 'audit'>('')
  const [form, setForm] = useState({ p: '', wh: '', to: '', type: 'زيادة', qty: 1, reason: '' })
  const [fErr, setFErr] = useState('')

  const openModal = (m: '' | 'adjust' | 'transfer' | 'audit') => {
    setModal(m)
    setForm({ p: opts?.products[0] ?? '', wh: opts?.warehouses[0] ?? '', to: opts?.warehouses[1] ?? '', type: 'زيادة', qty: 1, reason: '' })
    setFErr('')
  }

  const run = useMutation({
    mutationFn: async () => {
      if (modal === 'adjust') { await inventoryService.adjust(form.p, form.wh, form.type, form.qty, form.reason); return }
      if (modal === 'transfer') { await inventoryService.transfer(form.p, form.wh, form.to, form.qty); return }
      if (modal === 'audit') { await inventoryService.count(form.p, form.wh, form.qty); return }
    },
    onSuccess: () => {
      toast.success(modal === 'adjust' ? t('تم تسجيل تسوية المخزون بنجاح') : modal === 'transfer' ? t('تم تسجيل نقل المخزون بنجاح') : t('تم تسجيل نتيجة جرد المخزون بنجاح'))
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      setModal('')
    },
  })

  const submit = () => {
    if (!form.p) { setFErr(t('اسم المنتج مطلوب')); return }
    if (!form.qty || form.qty < 1) { setFErr(t('الكمية مطلوبة (عدد صحيح 1 على الأقل)')); return }
    if (modal === 'adjust' && !form.reason.trim()) { setFErr(t('السبب مطلوب')); return }
    if (modal === 'transfer' && form.wh === form.to) { setFErr(t('يجب اختيار مستودع مختلف للنقل')); return }
    setFErr('')
    run.mutate()
  }

  const columns: ColumnDef<StockLevel, unknown>[] = [
    { id: 'p', header: t('المنتج'), cell: ({ row }) => <b>{t(row.original.p)}</b> },
    { accessorKey: 'sku', header: t('رمز المنتج (SKU)'), cell: ({ row }) => <span dir="ltr">{row.original.sku}</span> },
    { id: 'wh', header: t('المستودع'), cell: ({ row }) => t(row.original.wh) },
    { accessorKey: 'avail', header: t('الكمية المتاحة'), cell: ({ row }) => <b>{row.original.avail}</b> },
    { accessorKey: 'res', header: t('الكمية المحجوزة') },
    { id: 'total', header: t('الإجمالي'), cell: ({ row }) => row.original.avail + row.original.res },
    { id: 'state', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.avail < 25 ? 'حرج' : row.original.avail < 50 ? 'تحذير' : 'اعتيادي'} /> },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.sku}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث باسم المنتج أو SKU...')} className="pe-9" aria-label={t('بحث في مستويات المخزون')} />
            </div>
            <select className={selectCls} value={wh} onChange={e => { setWh(e.target.value); setPage(1) }} aria-label={t('تصفية حسب المستودع')}>
              <option value="">{t('كل المستودعات')}</option>
              {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{t(w)}</option>)}
            </select>
            <div className="ms-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openModal('adjust')}>{t('تسوية المخزون')}</Button>
              <Button variant="outline" size="sm" onClick={() => openModal('transfer')}>{t('نقل المخزون بين المواقع')}</Button>
              <Button variant="outline" size="sm" onClick={() => openModal('audit')}>{t('بدء جرد المخزون')}</Button>
              <Button variant="outline" size="sm" onClick={() => { downloadCSV('stock-levels', ['المنتج', 'SKU', 'المستودع', 'متاح', 'محجوز', 'إجمالي'], (data?.rows ?? []).map(s => [s.p, s.sku, s.wh, s.avail, s.res, s.avail + s.res])); toast.success(t('تم تصدير الملف بنجاح')) }}>{t('تصدير')}</Button>
            </div>
          </div>
        } />

      <Modal open={!!modal} onClose={() => setModal('')} title={modal === 'adjust' ? t('تسوية المخزون') : modal === 'transfer' ? t('نقل المخزون بين المواقع') : t('بدء جرد المخزون')}
        footer={<>
          <Button variant="outline" onClick={() => setModal('')}>{t('إلغاء')}</Button>
          <Button disabled={run.isPending} onClick={submit}>{t('حفظ')}</Button>
        </>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>{t('اسم المنتج')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.p} onChange={e => setForm(f => ({ ...f, p: e.target.value }))}>
              <option value="">{t('اختر المنتج...')}</option>
              {(opts?.products ?? []).map(p => <option key={p} value={p}>{t(p)}</option>)}
            </select></div>
          {modal === 'adjust' && <>
            <div><Label>{t('المستودع')}</Label>
              <select className={selectCls + ' w-full'} value={form.wh} onChange={e => setForm(f => ({ ...f, wh: e.target.value }))}>
                {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{t(w)}</option>)}
              </select></div>
            <div><Label>{t('نوع التسوية')}</Label>
              <select className={selectCls + ' w-full'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="زيادة">{t('زيادة')}</option>
                <option value="إنقاص">{t('إنقاص')}</option>
              </select></div>
            <div><Label>{t('الكمية')} <span className="text-destructive">*</span></Label><Input type="number" min={1} value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: +e.target.value }))} /></div>
            <div><Label>{t('السبب')} <span className="text-destructive">*</span></Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={t('مثال: تصحيح بعد الجرد')} /></div>
          </>}
          {modal === 'transfer' && <>
            <div><Label>{t('المستودع المصدر')}</Label>
              <select className={selectCls + ' w-full'} value={form.wh} onChange={e => setForm(f => ({ ...f, wh: e.target.value }))}>
                {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{t(w)}</option>)}
              </select></div>
            <div><Label>{t('المستودع الوجهة')}</Label>
              <select className={selectCls + ' w-full'} value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}>
                {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{t(w)}</option>)}
              </select></div>
            <div><Label>{t('الكمية')} <span className="text-destructive">*</span></Label><Input type="number" min={1} value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: +e.target.value }))} /></div>
          </>}
          {modal === 'audit' && <>
            <div><Label>{t('المستودع')}</Label>
              <select className={selectCls + ' w-full'} value={form.wh} onChange={e => setForm(f => ({ ...f, wh: e.target.value }))}>
                {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{t(w)}</option>)}
              </select></div>
            <div><Label>{t('الكمية الفعلية')} <span className="text-destructive">*</span></Label><Input type="number" min={0} value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: +e.target.value }))} /></div>
          </>}
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
    </div>
  )
}

/* ---------- استخدام التخزين حسب التاجر (CR-003) ---------- */
export function StorageUsagePage() {
  const t = useT()
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, st, page, pageSize: 10 }), [dq, st, page])
  const { data, isLoading } = useQuery({ queryKey: ['storage-usage', qp], queryFn: () => inventoryService.usage(qp) })

  const columns: ColumnDef<Merchant & { pct: number; st: string }, unknown>[] = [
    { accessorKey: 'store', header: t('التاجر'), cell: ({ row }) => <b>{row.original.store}</b> },
    { accessorKey: 'email', header: t('البريد الإلكتروني') },
    { id: 'limit', header: t('حد التخزين المجاني'), cell: ({ row }) => row.original.limit + ' ' + t(row.original.unit) },
    { id: 'used', header: t('المستخدم حاليًا'), cell: ({ row }) => row.original.used + ' ' + t(row.original.unit) },
    { id: 'pct', header: t('نسبة الاستخدام'), cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className={'flex h-2 w-24 overflow-hidden rounded-full bg-muted'}>
          <div className={'h-full ' + (row.original.st === 'متجاوز' ? 'bg-destructive' : row.original.st === 'تحذير' ? 'bg-warning' : 'bg-foreground')} style={{ width: Math.min(100, row.original.pct) + '%' }} />
        </div>
        <b>{row.original.pct}%</b>
      </div>) },
    { id: 'remaining', header: t('المتبقي'), cell: ({ row }) => Math.max(0, row.original.limit - row.original.used) + ' ' + t(row.original.unit) },
    { id: 'st', header: t('حالة الحد'), cell: ({ row }) => <StatusBadge value={row.original.st} /> },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        getRowClassName={r => (r.st === 'متجاوز' ? 'bg-red-50/60' : r.st === 'تحذير' ? 'bg-amber-50/50' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث باسم التاجر أو بريده...')} className="pe-9" aria-label={t('بحث في استخدام التخزين')} />
            </div>
            <select className={selectCls} value={st} onChange={e => { setSt(e.target.value); setPage(1) }} aria-label={t('تصفية حسب حالة الحد')}>
              <option value="">{t('كل الحالات')}</option>
              <option value="اعتيادي">{t('اعتيادي')}</option>
              <option value="تحذير">{t('تحذير')}</option>
              <option value="متجاوز">{t('متجاوز')}</option>
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('storage-usage', ['التاجر', 'الحد', 'المستخدم', 'النسبة', 'المتبقي', 'الحالة'], (data?.rows ?? []).map(r => [r.store, r.limit + ' ' + r.unit, r.used + ' ' + r.unit, r.pct + '%', Math.max(0, r.limit - r.used) + ' ' + r.unit, r.st])); toast.success(t('تم تصدير الملف بنجاح')) }}>{t('تصدير')}</Button>
          </div>
        } />
    </div>
  )
}
