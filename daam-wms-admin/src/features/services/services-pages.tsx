import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/tables/data-table'
import { ActionButtons, AttachmentBadgeList, ConfirmDialog, Modal, StatusBadge, selectCls } from '@/components/common'
import { servicesService } from '@/services/services.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, money, todayISO } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { ServiceRequest, ServiceType, Subscription } from '@/types'
import { CheckCircle, CheckCircle2, Eye, Pencil, RefreshCw, Search, XCircle } from 'lucide-react'
const STAFF = ['سعود الفهد', 'ماجد العوفي', 'وليد حسن', 'ناصر كمال']
const UNITS = ['لكل قطعة', 'لكل ساعة', 'لكل طبلية', 'لكل طلب', 'ثابتة']
export function ServiceRequestsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [q, setQ] = useState(''); const [urgency, setUrgency] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, urgency, status, page, pageSize: 10 }), [dq, urgency, status, page])
  const { data, isLoading } = useQuery({ queryKey: ['service-requests', qp], queryFn: () => servicesService.requests(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['service-requests'] })
  const [approving, setApproving] = useState<ServiceRequest | null>(null)
  const [viewing, setViewing] = useState<ServiceRequest | null>(null)
  const [form, setForm] = useState({ cost: 0, date: todayISO(), staff: '', notes: '' })
  const [fErr, setFErr] = useState('')
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState(''); const [rErr, setRErr] = useState('')
  const approve = useMutation({ mutationFn: (v: { ref: string; data: typeof form }) => servicesService.approveRequest(v.ref, v.data), onSuccess: sub => { toast.success(t('تمت الموافقة على طلب الخدمة بنجاح') + (sub ? t(' — تم إنشاء الاشتراك: ') + sub : '')); invalidate(); setApproving(null) }, onError: e => toast.error((e as Error).message) })
  const reject = useMutation({ mutationFn: (v: { ref: string; reason: string }) => servicesService.rejectRequest(v.ref, v.reason), onSuccess: () => { toast.success(t('تم رفض طلب الخدمة بنجاح')); invalidate(); setRejecting(null) } })
  const advance = useMutation({ mutationFn: (ref: string) => servicesService.advanceStatus(ref), onSuccess: s => { toast.success(t('تم تحديث حالة طلب الخدمة إلى ') + t(s) + t(' بنجاح')); invalidate() }, onError: e => toast.error((e as Error).message) })
  const columns: ColumnDef<ServiceRequest, unknown>[] = [
    { accessorKey: 'ref', header: t('المرجع'), cell: ({ row }) => <b>{row.original.ref}</b> },
    { id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },
    { accessorKey: 'type', header: t('الخدمة'), cell: ({ row }) => t(row.original.type) },
    { accessorKey: 'prod', header: t('المنتج المرتبط'), cell: ({ row }) => t(row.original.prod) },
    { accessorKey: 'qty', header: t('الكمية') },
    { id: 'cost', header: t('التكلفة'), cell: ({ row }) => money(row.original.cost) },
    { id: 'urgency', header: t('الإلحاح'), cell: ({ row }) => <StatusBadge value={row.original.urgency} /> },
    { id: 'date', header: t('التاريخ المفضل'), cell: ({ row }) => arDate(row.original.date) },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => { const s = row.original; return (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض التفاصيل'), onClick: () => setViewing(s) },
        { icon: CheckCircle, label: t('اعتماد الطلب'), onClick: () => { setApproving(s); setForm({ cost: s.cost, date: todayISO(), staff: '', notes: '' }); setFErr('') }, hidden: s.status !== 'معلق' },
        { icon: XCircle, label: t('رفض الطلب'), variant: 'destructive', onClick: () => { setRejecting(s.ref); setReason(''); setRErr('') }, hidden: s.status !== 'معلق' },
        { icon: RefreshCw, label: s.status === 'معتمد' ? t('بدء التنفيذ') : t('إكمال الخدمة'), onClick: () => advance.mutate(s.ref), hidden: s.status !== 'معتمد' && s.status !== 'قيد التنفيذ' },
      ]} />) } },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        getRowClassName={r => (r.urgency === 'حرج' && r.status === 'معلق' ? 'outline outline-2 -outline-offset-2 outline-destructive' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بالمرجع أو التاجر أو الخدمة...')} className="pe-9" aria-label={t('بحث في طلبات الخدمة')} />
            </div>
            <select className={selectCls} value={urgency} onChange={e => { setUrgency(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الإلحاح')}>
              <option value="">{t('كل مستويات الإلحاح')}</option>
              {['عادي', 'عاجل', 'حرج'].map(u => <option key={u} value={u}>{t(u)}</option>)}
            </select>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['معلق', 'معتمد', 'قيد التنفيذ', 'مكتمل', 'مرفوض'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <p className="ms-auto text-xs font-semibold text-muted-foreground">{t('الطلبات الحرجة محاطة بإطار أحمر')}</p>
          </div>
        } />
      <Modal open={!!approving} onClose={() => setApproving(null)} title={t('اعتماد طلب الخدمة') + ' — ' + (approving?.ref ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setApproving(null)}>{t('إلغاء')}</Button>
          <Button disabled={approve.isPending} onClick={() => {
            if (!form.cost || form.cost < 0.01) { setFErr(t('التكلفة الفعلية مطلوبة (0.01 على الأقل)')); return }
            if (form.cost > 100000) { setFErr(t('التكلفة الفعلية يجب أن تكون أقل من 100,000')); return }
            if (!form.date) { setFErr(t('التاريخ المجدول مطلوب')); return }
            if (form.date < todayISO()) { setFErr(t('التاريخ المجدول يجب أن يكون اليوم أو تاريخًا مستقبليًا')); return }
            if (!form.staff) { setFErr(t('الموظف المسؤول مطلوب')); return }
            if (form.notes.length > 300) { setFErr(t('ملاحظات الاعتماد يجب أن تكون أقل من 300 حرف')); return }
            setFErr('')
            approve.mutate({ ref: approving!.ref, data: form })
          }}>{t('تأكيد الاعتماد')}</Button>
        </>}>
        {approving && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[[t('التاجر'), t(approving.m)], [t('الخدمة'), t(approving.type)], [t('الكمية'), String(approving.qty)], [t('التكلفة التقديرية'), money(approving.cost)]].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>{t('التكلفة الفعلية')} <span className="text-destructive">*</span></Label><Input type="number" step="0.01" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} /></div>
            <div><Label>{t('التاريخ المجدول')} <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>{t('الموظف المسؤول')} <span className="text-destructive">*</span></Label>
              <select className={selectCls + ' w-full'} value={form.staff} onChange={e => setForm(f => ({ ...f, staff: e.target.value }))}>
                <option value="">{t('اختر الموظف...')}</option>
                {STAFF.map(s => <option key={s} value={s}>{t(s)}</option>)}
              </select></div>
            <div><Label>{t('ملاحظات (اختياري — 300 حرف)')}</Label><Input value={form.notes} maxLength={300} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
        </>}
      </Modal>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={t('رفض طلب الخدمة') + ' — ' + (rejecting ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>{t('إلغاء')}</Button>
          <Button variant="destructive" disabled={reject.isPending} onClick={() => {
            const v = reason.trim()
            if (!v) { setRErr(t('سبب الرفض مطلوب')); return }
            if (v.length < 10 || v.length > 500) { setRErr(t('يجب أن يكون سبب الرفض بين 10 و 500 حرف')); return }
            setRErr('')
            reject.mutate({ ref: rejecting!, reason: v })
          }}>{t('تأكيد الرفض')}</Button>
        </>}>
        <Label>{t('سبب الرفض')} <span className="text-destructive">*</span> (10 – 500 {t('حرف')})</Label>
        <Textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
        {rErr && <p className="mt-1 text-xs font-bold text-destructive">{rErr}</p>}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={t('تفاصيل طلب الخدمة') + ' — ' + (viewing?.ref ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setViewing(null)}>{t('إغلاق')}</Button>
        </>}>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                [t('المرجع'), viewing.ref],
                [t('التاجر'), t(viewing.m)],
                [t('الخدمة'), t(viewing.type)],
                [t('المنتج المرتبط'), t(viewing.prod)],
                [t('الكمية'), String(viewing.qty)],
                [t('التكلفة التقديرية'), money(viewing.cost)],
                [t('الإلحاح'), t(viewing.urgency)],
                [t('التاريخ المفضل'), arDate(viewing.date)],
                [t('تاريخ الطلب'), arDate(viewing.req)],
                [t('الحالة'), t(viewing.status)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2">
                  <p className="text-[11px] font-bold text-muted-foreground">{k}</p>
                  <p className="text-[13px] font-extrabold">{v}</p>
                </div>
              ))}
            </div>
            {viewing.notes && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground">{t('الملاحظات')}</p>
                <div className="mt-1 rounded-lg border bg-muted/40 p-3 text-sm font-semibold">
                  {t(viewing.notes)}
                </div>
              </div>
            )}
            {viewing.attachment && (
              <div>
                <p className="mb-1 text-[11px] font-bold text-muted-foreground">{t('المرفقات')}</p>
                <AttachmentBadgeList attachments={[viewing.attachment]} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
export function SubscriptionsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [freq, setFreq] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, freq, page, pageSize: 10 }), [dq, status, freq, page])
  const { data, isLoading } = useQuery({ queryKey: ['subscriptions', qp], queryFn: () => servicesService.subscriptions(qp) })
  const [cancelling, setCancelling] = useState<Subscription | null>(null)
  const cancel = useMutation({ mutationFn: (id: string) => servicesService.cancelSubscription(id), onSuccess: () => { toast.success(t('تم إلغاء الاشتراك بنجاح')); qc.invalidateQueries({ queryKey: ['subscriptions'] }); setCancelling(null) } })
  const columns: ColumnDef<Subscription, unknown>[] = [
    { accessorKey: 'id', header: t('الاشتراك'), cell: ({ row }) => <b>{row.original.id}</b> },
    { id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },
    { accessorKey: 'type', header: t('الخدمة'), cell: ({ row }) => t(row.original.type) },
    { id: 'cost', header: t('تكلفة الدورة'), cell: ({ row }) => money(row.original.cost) },
    { id: 'freq', header: t('الدورية'), cell: ({ row }) => <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-700">{t(row.original.freq)}</span> },
    { id: 'next', header: t('الفوترة القادمة'), cell: ({ row }) => arDate(row.original.next) },
    { id: 'total', header: t('إجمالي المفوتر'), cell: ({ row }) => money(row.original.total) },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: XCircle, label: t('إلغاء الاشتراك'), variant: 'destructive', onClick: () => setCancelling(row.original), hidden: row.original.status !== 'نشط' },
      ]} />) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        getRowClassName={r => (r.status === 'فشل الدفع' ? 'bg-red-50/60' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بالتاجر أو الخدمة...')} className="pe-9" aria-label={t('بحث في الاشتراكات')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['نشط', 'ملغي', 'فشل الدفع'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <select className={selectCls} value={freq} onChange={e => { setFreq(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الدورية')}>
              <option value="">{t('كل الدوريات')}</option>
              {['شهري', 'ربع سنوي', 'أسبوعي', 'سنوي'].map(f => <option key={f} value={f}>{t(f)}</option>)}
            </select>
            <p className="ms-auto text-xs font-semibold text-muted-foreground">{t('اشتراكات فشل الدفع مميزة بالأحمر (CR-004)')}</p>
          </div>
        } />
      <ConfirmDialog open={!!cancelling} onOpenChange={v => { if (!v) setCancelling(null) }} destructive title={t('إلغاء الاشتراك')} loading={cancel.isPending}
        description={t('هل أنت متأكد من إلغاء هذا الاشتراك؟')}
        confirmLabel={t('إلغاء الاشتراك')} onConfirm={() => cancel.mutate(cancelling!.id)} />
    </div>
  )
}
export function ServiceTypesPage() {
  const qc = useQueryClient()
  const t = useT()
  const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, page, pageSize: 10 }), [dq, page])
  const { data, isLoading } = useQuery({ queryKey: ['service-types', qp], queryFn: () => servicesService.types(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['service-types'] })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const [form, setForm] = useState<ServiceType>({ name: '', desc: '', cost: 0, unit: 'لكل قطعة', prod: 'نعم', status: 'نشط', model: 'دفعة واحدة', freq: '—' })
  const [fErr, setFErr] = useState('')
  const save = useMutation({ mutationFn: () => servicesService.saveType(form, editing?.name), onSuccess: () => { toast.success(editing ? t('تم تحديث نوع الخدمة بنجاح') : t('تم إنشاء نوع الخدمة بنجاح')); invalidate(); setOpen(false) }, onError: e => toast.error((e as Error).message) })
  const toggle = useMutation({ mutationFn: (name: string) => servicesService.toggleType(name), onSuccess: m => { toast.success(t(m)); invalidate() } })
  const submit = () => {
    if (form.name.length < 3 || form.name.length > 100) { setFErr(t('يجب أن يكون اسم الخدمة بين 3 و 100 حرف')); return }
    if (form.desc.length < 10 || form.desc.length > 500) { setFErr(t('يجب أن يكون وصف الخدمة بين 10 و 500 حرف')); return }
    if (isNaN(form.cost) || form.cost < 0 || form.cost > 100000) { setFErr(t('التكلفة الأساسية مطلوبة (0 – 100,000)')); return }
    if (form.model === 'متكرر' && form.freq === '—') { setFErr(t('دورية الفوترة مطلوبة للنموذج المتكرر')); return }
    setFErr('')
    save.mutate()
  }
  const columns: ColumnDef<ServiceType, unknown>[] = [
    { accessorKey: 'name', header: t('اسم الخدمة'), cell: ({ row }) => <b>{t(row.original.name)}</b> },
    { accessorKey: 'desc', header: t('الوصف'), cell: ({ row }) => <span className="block max-w-[280px] truncate">{t(row.original.desc)}</span> },
    { id: 'cost', header: t('التكلفة الأساسية'), cell: ({ row }) => money(row.original.cost) },
    { accessorKey: 'unit', header: t('وحدة التكلفة'), cell: ({ row }) => t(row.original.unit) },
    { id: 'model', header: t('نموذج الدفع'), cell: ({ row }) => <StatusBadge value={row.original.model} /> },
    { id: 'freq', header: t('الدورية'), cell: ({ row }) => row.original.freq === '—' ? '—' : <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-700">{t(row.original.freq)}</span> },
    { accessorKey: 'prod', header: t('يتطلب منتجًا'), cell: ({ row }) => t(row.original.prod) },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Pencil, label: t('تعديل'), onClick: () => { setEditing(row.original); setForm(row.original); setFErr(''); setOpen(true) } },
        { icon: row.original.status === 'نشط' ? XCircle : CheckCircle2, label: row.original.status === 'نشط' ? t('تعطيل') : t('تفعيل'), onClick: () => toggle.mutate(row.original.name) },
      ]} />) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.name}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث في أنواع الخدمات...')} className="pe-9" aria-label={t('بحث في أنواع الخدمات')} />
            </div>
            <Button size="sm" className="ms-auto" onClick={() => { setEditing(null); setForm({ name: '', desc: '', cost: 0, unit: 'لكل قطعة', prod: 'نعم', status: 'نشط', model: 'دفعة واحدة', freq: '—' }); setFErr(''); setOpen(true) }}>{t('إنشاء نوع خدمة')}</Button>
          </div>
        } />
      <Modal open={open} onClose={() => setOpen(false)} wide title={editing ? t('تعديل نوع الخدمة') : t('إنشاء نوع خدمة جديد')}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('إلغاء')}</Button>
          <Button disabled={save.isPending} onClick={submit}>{t('حفظ')}</Button>
        </>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>{t('اسم الخدمة')} (3 – 100 {t('حرف')}) <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="md:col-span-2"><Label>{t('وصف الخدمة')} (10 – 500 {t('حرف')}) <span className="text-destructive">*</span></Label><Textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /></div>
          <div><Label>{t('التكلفة الأساسية')} (0 – 100,000) <span className="text-destructive">*</span></Label><Input type="number" step="0.01" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} /></div>
          <div><Label>{t('وحدة التكلفة')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u} value={u}>{t(u)}</option>)}
            </select></div>
          <div><Label>{t('نموذج الدفع')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value as ServiceType['model'], freq: e.target.value === 'متكرر' ? 'شهري' : '—' }))}>
              <option value="دفعة واحدة">{t('دفعة واحدة')}</option>
              <option value="متكرر">{t('متكرر')}</option>
            </select></div>
          {form.model === 'متكرر' && <div><Label>{t('دورية الفوترة')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value }))}>
              {['أسبوعي', 'شهري', 'ربع سنوي', 'سنوي'].map(f => <option key={f} value={f}>{t(f)}</option>)}
            </select></div>}
          <div><Label>{t('يتطلب منتجًا')} <span className="text-destructive">*</span></Label>
            <div className="flex gap-5 pt-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.prod === 'نعم'} onChange={() => setForm(f => ({ ...f, prod: 'نعم' }))} /> {t('نعم')}</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.prod === 'لا'} onChange={() => setForm(f => ({ ...f, prod: 'لا' }))} /> {t('لا')}</label>
            </div></div>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
    </div>
  )
}
