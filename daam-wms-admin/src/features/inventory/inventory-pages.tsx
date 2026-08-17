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
import { ConfirmDialog, Modal, StatusBadge, selectCls } from '@/components/common'
import { inventoryService } from '@/services/inventory.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV } from '@/lib/utils'
import type { Merchant, StockLevel, StockRequest } from '@/types'
import { Search } from 'lucide-react'
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
  const [viewing, setViewing] = useState<StockRequest | null>(null)

  const approve = useMutation({ mutationFn: (id: string) => inventoryService.approveRequest(id), onSuccess: () => { toast.success('تمت الموافقة على طلب المخزون بنجاح'); invalidate(); setApproving(null) } })
  const reject = useMutation({ mutationFn: (v: { id: string; reason: string }) => inventoryService.rejectRequest(v.id, v.reason), onSuccess: () => { toast.success('تم رفض طلب المخزون بنجاح'); invalidate(); setRejecting(null) } })

  const columns: ColumnDef<StockRequest, unknown>[] = [
    { accessorKey: 'id', header: t('رقم الطلب'), cell: ({ row }) => <b>{row.original.id}</b> },
    { accessorKey: 'm', header: t('التاجر') },
    { accessorKey: 'p', header: t('المنتج') },
    { accessorKey: 'wh', header: t('المستودع') },
    { accessorKey: 'qty', header: t('الكمية') },
    { id: 'type', header: t('النوع'), cell: ({ row }) => <StatusBadge value={row.original.type} /> },
    { id: 'date', header: t('تاريخ الطلب'), cell: ({ row }) => arDate(row.original.date) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => navigate(`/records/stock-request/${row.original.id}`)}>{t('عرض')}</Button>
        <Button size="sm" variant="outline" onClick={() => setApproving(row.original.id)}>{t('اعتماد')}</Button>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setRejecting(row.original.id); setReason(''); setRErr('') }}>{t('رفض')}</Button>
      </div>) },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث برقم الطلب أو اسم التاجر..." className="pe-9" aria-label="بحث في طلبات المخزون" />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label="تصفية حسب النوع">
              <option value="">كل الأنواع</option>
              <option value="إضافة">إضافة</option>
              <option value="سحب">سحب</option>
            </select>
            <span className="ms-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">{data?.total ?? 0} طلب معلق</span>
          </div>
        } />

      <ConfirmDialog open={!!approving} onOpenChange={v => { if (!v) setApproving(null) }} title="اعتماد طلب المخزون" loading={approve.isPending}
        description={'هل أنت متأكد من اعتماد طلب المخزون ' + (approving ?? '') + '؟ سيتم تحديث مستويات المخزون في النظام فور الاعتماد.'}
        confirmLabel="اعتماد" onConfirm={() => approve.mutate(approving!)} />

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={'رفض طلب المخزون — ' + (rejecting ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>إلغاء</Button>
          <Button variant="destructive" disabled={reject.isPending} onClick={() => {
            const r = reason.trim()
            if (!r) { setRErr('سبب الرفض مطلوب'); return }
            if (r.length < 10 || r.length > 500) { setRErr('يجب أن يكون سبب الرفض بين 10 و 500 حرف'); return }
            setRErr('')
            reject.mutate({ id: rejecting!, reason: r })
          }}>تأكيد الرفض</Button>
        </>}>
        <Label>سبب الرفض <span className="text-destructive">*</span> (10 – 500 حرف)</Label>
        <Textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} placeholder="اشرح سبب رفض الطلب..." />
        {rErr && <p className="mt-1 text-xs font-bold text-destructive">{rErr}</p>}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={'تفاصيل طلب المخزون — ' + (viewing?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setViewing(null)}>إغلاق</Button>
          {viewing?.status === 'معلق' && (
            <>
              <Button onClick={() => { setViewing(null); setApproving(viewing.id); }}>اعتماد</Button>
              <Button variant="destructive" onClick={() => { setViewing(null); setRejecting(viewing.id); setReason(''); setRErr(''); }}>رفض</Button>
            </>
          )}
        </>}>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['رقم الطلب', viewing.id],
                ['التاجر', viewing.m],
                ['المنتج', viewing.p],
                ['المستودع', viewing.wh],
                ['الكمية', String(viewing.qty)],
                ['النوع', viewing.type],
                ['التاريخ', arDate(viewing.date)],
                ['الحالة', viewing.status],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2">
                  <p className="text-[11px] font-bold text-muted-foreground">{k}</p>
                  <p className="text-[13px] font-extrabold">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">الملاحظات</p>
              <div className="mt-1 rounded-lg border bg-muted/40 p-3 text-sm font-semibold">
                {viewing.notes || 'لا توجد ملاحظات مرفقة'}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">المرفقات</p>
              <div className="mt-1 rounded-lg border bg-muted/40 p-3 text-sm">
                {viewing.attachment ? (
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-600">📎 {viewing.attachment}</span>
                    <Button size="sm" variant="outline" onClick={() => toast.success(`تم تحميل المرفق: ${viewing.attachment}`)}>تحميل المرفق</Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground">لا توجد مرفقات</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ---------- مستويات المخزون ---------- */
export function StockLevelsPage() {
  const qc = useQueryClient()
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

  const openModal = (m: 'adjust' | 'transfer' | 'audit') => {
    setForm(f => ({ ...f, p: f.p || opts?.products[0] || '', wh: f.wh || opts?.warehouses[0] || '', to: f.to || opts?.warehouses[1] || '' }))
    setFErr('')
    setModal(m)
  }

  const run = useMutation({
    mutationFn: async () => {
      if (modal === 'adjust') return inventoryService.adjust(form.p, form.wh, form.type, form.qty, form.reason)
      if (modal === 'transfer') return inventoryService.transfer(form.p, form.wh, form.to, form.qty)
      return inventoryService.count(form.p, form.wh, form.qty)
    },
    onSuccess: diff => {
      if (modal === 'adjust') toast.success('تم تعديل المخزون بنجاح')
      else if (modal === 'transfer') toast.success('تم نقل المخزون بنجاح')
      else toast.success('تم الانتهاء من الجرد بنجاح' + (typeof diff === 'number' && diff !== 0 ? ' — تم اكتشاف فرق (' + diff + ') وتسوية المخزون' : ''))
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      setModal('')
    },
  })

  const submit = () => {
    if (!form.p) { setFErr('اسم المنتج مطلوب'); return }
    if (!form.qty || form.qty < 1) { setFErr('الكمية مطلوبة (عدد صحيح 1 على الأقل)'); return }
    if (modal === 'adjust' && !form.reason.trim()) { setFErr('السبب مطلوب'); return }
    if (modal === 'transfer' && form.wh === form.to) { setFErr('يجب اختيار مستودع مختلف للنقل'); return }
    setFErr('')
    run.mutate()
  }

  const columns: ColumnDef<StockLevel, unknown>[] = [
    { accessorKey: 'p', header: 'المنتج', cell: ({ row }) => <b>{row.original.p}</b> },
    { accessorKey: 'sku', header: 'رمز المنتج (SKU)', cell: ({ row }) => <span dir="ltr">{row.original.sku}</span> },
    { accessorKey: 'wh', header: 'المستودع' },
    { accessorKey: 'avail', header: 'الكمية المتاحة', cell: ({ row }) => <b>{row.original.avail}</b> },
    { accessorKey: 'res', header: 'الكمية المحجوزة' },
    { id: 'total', header: 'الإجمالي', cell: ({ row }) => row.original.avail + row.original.res },
    { id: 'state', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.avail < 25 ? 'حرج' : row.original.avail < 50 ? 'تحذير' : 'اعتيادي'} /> },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.sku}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث باسم المنتج أو SKU..." className="pe-9" aria-label="بحث في مستويات المخزون" />
            </div>
            <select className={selectCls} value={wh} onChange={e => { setWh(e.target.value); setPage(1) }} aria-label="تصفية حسب المستودع">
              <option value="">كل المستودعات</option>
              {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <div className="ms-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openModal('adjust')}>تسوية مخزون</Button>
              <Button variant="outline" size="sm" onClick={() => openModal('transfer')}>نقل مخزون</Button>
              <Button variant="outline" size="sm" onClick={() => openModal('audit')}>بدء جرد</Button>
              <Button variant="outline" size="sm" onClick={() => { downloadCSV('stock-levels', ['المنتج', 'SKU', 'المستودع', 'متاح', 'محجوز', 'إجمالي'], (data?.rows ?? []).map(s => [s.p, s.sku, s.wh, s.avail, s.res, s.avail + s.res])); toast.success('تم تصدير الملف بنجاح') }}>تصدير</Button>
            </div>
          </div>
        } />

      <Modal open={!!modal} onClose={() => setModal('')} title={modal === 'adjust' ? 'تسوية المخزون' : modal === 'transfer' ? 'نقل المخزون بين المواقع' : 'بدء جرد المخزون'}
        footer={<>
          <Button variant="outline" onClick={() => setModal('')}>إلغاء</Button>
          <Button disabled={run.isPending} onClick={submit}>حفظ</Button>
        </>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>اسم المنتج <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.p} onChange={e => setForm(f => ({ ...f, p: e.target.value }))}>
              <option value="">اختر المنتج...</option>
              {(opts?.products ?? []).map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
          {modal === 'adjust' && <>
            <div><Label>المستودع</Label>
              <select className={selectCls + ' w-full'} value={form.wh} onChange={e => setForm(f => ({ ...f, wh: e.target.value }))}>
                {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{w}</option>)}
              </select></div>
            <div><Label>نوع التسوية</Label>
              <select className={selectCls + ' w-full'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="زيادة">زيادة</option>
                <option value="إنقاص">إنقاص</option>
              </select></div>
            <div><Label>الكمية <span className="text-destructive">*</span></Label><Input type="number" min={1} value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: +e.target.value }))} /></div>
            <div><Label>السبب <span className="text-destructive">*</span></Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="مثال: تصحيح بعد الجرد" /></div>
          </>}
          {modal === 'transfer' && <>
            <div><Label>المستودع المصدر</Label>
              <select className={selectCls + ' w-full'} value={form.wh} onChange={e => setForm(f => ({ ...f, wh: e.target.value }))}>
                {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{w}</option>)}
              </select></div>
            <div><Label>المستودع الوجهة</Label>
              <select className={selectCls + ' w-full'} value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}>
                {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{w}</option>)}
              </select></div>
            <div><Label>الكمية <span className="text-destructive">*</span></Label><Input type="number" min={1} value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: +e.target.value }))} /></div>
          </>}
          {modal === 'audit' && <>
            <div><Label>المستودع</Label>
              <select className={selectCls + ' w-full'} value={form.wh} onChange={e => setForm(f => ({ ...f, wh: e.target.value }))}>
                {(opts?.warehouses ?? []).map(w => <option key={w} value={w}>{w}</option>)}
              </select></div>
            <div><Label>الكمية الفعلية <span className="text-destructive">*</span></Label><Input type="number" min={0} value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: +e.target.value }))} /></div>
          </>}
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
    </div>
  )
}

/* ---------- استخدام التخزين حسب التاجر (CR-003) ---------- */
export function StorageUsagePage() {
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, st, page, pageSize: 10 }), [dq, st, page])
  const { data, isLoading } = useQuery({ queryKey: ['storage-usage', qp], queryFn: () => inventoryService.usage(qp) })

  const columns: ColumnDef<Merchant & { pct: number; st: string }, unknown>[] = [
    { accessorKey: 'store', header: 'التاجر', cell: ({ row }) => <b>{row.original.store}</b> },
    { accessorKey: 'email', header: 'البريد الإلكتروني' },
    { id: 'limit', header: 'حد التخزين المجاني', cell: ({ row }) => row.original.limit + ' ' + row.original.unit },
    { id: 'used', header: 'المستخدم حاليًا', cell: ({ row }) => row.original.used + ' ' + row.original.unit },
    { id: 'pct', header: 'نسبة الاستخدام', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className={'flex h-2 w-24 overflow-hidden rounded-full bg-muted'}>
          <div className={'h-full ' + (row.original.st === 'متجاوز' ? 'bg-destructive' : row.original.st === 'تحذير' ? 'bg-warning' : 'bg-foreground')} style={{ width: Math.min(100, row.original.pct) + '%' }} />
        </div>
        <b>{row.original.pct}%</b>
      </div>) },
    { id: 'remaining', header: 'المتبقي', cell: ({ row }) => Math.max(0, row.original.limit - row.original.used) + ' ' + row.original.unit },
    { id: 'st', header: 'حالة الحد', cell: ({ row }) => <StatusBadge value={row.original.st} /> },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        getRowClassName={r => (r.st === 'متجاوز' ? 'bg-red-50/60' : r.st === 'تحذير' ? 'bg-amber-50/50' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث باسم التاجر أو بريده..." className="pe-9" aria-label="بحث في استخدام التخزين" />
            </div>
            <select className={selectCls} value={st} onChange={e => { setSt(e.target.value); setPage(1) }} aria-label="تصفية حسب حالة الحد">
              <option value="">كل الحالات</option>
              <option value="اعتيادي">اعتيادي</option>
              <option value="تحذير">تحذير</option>
              <option value="متجاوز">متجاوز</option>
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('storage-usage', ['التاجر', 'الحد', 'المستخدم', 'النسبة', 'المتبقي', 'الحالة'], (data?.rows ?? []).map(r => [r.store, r.limit + ' ' + r.unit, r.used + ' ' + r.unit, r.pct + '%', Math.max(0, r.limit - r.used) + ' ' + r.unit, r.st])); toast.success('تم تصدير الملف بنجاح') }}>تصدير</Button>
          </div>
        } />
    </div>
  )
}
