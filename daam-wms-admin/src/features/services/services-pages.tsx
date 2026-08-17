import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/tables/data-table'
import { ConfirmDialog, Modal, StatusBadge, selectCls } from '@/components/common'
import { servicesService } from '@/services/services.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, money, todayISO } from '@/lib/utils'
import type { ServiceRequest, ServiceType, Subscription } from '@/types'
import { Search } from 'lucide-react'
const STAFF = ['سعود الفهد', 'ماجد العوفي', 'وليد حسن', 'ناصر كمال']
const UNITS = ['لكل قطعة', 'لكل ساعة', 'لكل طبلية', 'لكل طلب', 'ثابتة']
export function ServiceRequestsPage() {
  const qc = useQueryClient()
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
  const approve = useMutation({ mutationFn: (v: { ref: string; data: typeof form }) => servicesService.approveRequest(v.ref, v.data), onSuccess: sub => { toast.success('تمت الموافقة على طلب الخدمة بنجاح' + (sub ? ' — تم إنشاء الاشتراك: ' + sub : '')); invalidate(); setApproving(null) }, onError: e => toast.error((e as Error).message) })
  const reject = useMutation({ mutationFn: (v: { ref: string; reason: string }) => servicesService.rejectRequest(v.ref, v.reason), onSuccess: () => { toast.success('تم رفض طلب الخدمة بنجاح'); invalidate(); setRejecting(null) } })
  const advance = useMutation({ mutationFn: (ref: string) => servicesService.advanceStatus(ref), onSuccess: s => { toast.success('تم تحديث حالة طلب الخدمة إلى ' + s + ' بنجاح'); invalidate() }, onError: e => toast.error((e as Error).message) })
  const columns: ColumnDef<ServiceRequest, unknown>[] = [
    { accessorKey: 'ref', header: 'المرجع', cell: ({ row }) => <b>{row.original.ref}</b> },
    { accessorKey: 'm', header: 'التاجر' },
    { accessorKey: 'type', header: 'الخدمة' },
    { accessorKey: 'prod', header: 'المنتج المرتبط' },
    { accessorKey: 'qty', header: 'الكمية' },
    { id: 'cost', header: 'التكلفة', cell: ({ row }) => money(row.original.cost) },
    { id: 'urgency', header: 'الإلحاح', cell: ({ row }) => <StatusBadge value={row.original.urgency} /> },
    { id: 'date', header: 'التاريخ المفضل', cell: ({ row }) => arDate(row.original.date) },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => { const s = row.original; return (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => setViewing(s)}>عرض</Button>
        {s.status === 'معلق' && <>
          <Button size="sm" variant="outline" onClick={() => { setApproving(s); setForm({ cost: s.cost, date: todayISO(), staff: '', notes: '' }); setFErr('') }}>اعتماد</Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setRejecting(s.ref); setReason(''); setRErr('') }}>رفض</Button>
        </>}
        {(s.status === 'معتمد' || s.status === 'قيد التنفيذ') && <Button size="sm" variant="outline" onClick={() => advance.mutate(s.ref)}>تحديث الحالة</Button>}
      </div>) } },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        getRowClassName={r => (r.urgency === 'حرج' && r.status === 'معلق' ? 'outline outline-2 -outline-offset-2 outline-destructive' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث بالمرجع أو التاجر أو الخدمة..." className="pe-9" aria-label="بحث في طلبات الخدمة" />
            </div>
            <select className={selectCls} value={urgency} onChange={e => { setUrgency(e.target.value); setPage(1) }} aria-label="تصفية حسب الإلحاح">
              <option value="">كل مستويات الإلحاح</option>
              {['عادي', 'عاجل', 'حرج'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              {['معلق', 'معتمد', 'قيد التنفيذ', 'مكتمل', 'مرفوض'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="ms-auto text-xs font-semibold text-muted-foreground">الطلبات الحرجة محاطة بإطار أحمر</p>
          </div>
        } />
      <Modal open={!!approving} onClose={() => setApproving(null)} title={'اعتماد طلب الخدمة — ' + (approving?.ref ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setApproving(null)}>إلغاء</Button>
          <Button disabled={approve.isPending} onClick={() => {
            if (!form.cost || form.cost < 0.01) { setFErr('التكلفة الفعلية مطلوبة (0.01 على الأقل)'); return }
            if (form.cost > 100000) { setFErr('التكلفة الفعلية يجب أن تكون أقل من 100,000'); return }
            if (!form.date) { setFErr('التاريخ المجدول مطلوب'); return }
            if (form.date < todayISO()) { setFErr('التاريخ المجدول يجب أن يكون اليوم أو تاريخًا مستقبليًا'); return }
            if (!form.staff) { setFErr('الموظف المسؤول مطلوب'); return }
            if (form.notes.length > 300) { setFErr('ملاحظات الاعتماد يجب أن تكون أقل من 300 حرف'); return }
            setFErr('')
            approve.mutate({ ref: approving!.ref, data: form })
          }}>تأكيد الاعتماد</Button>
        </>}>
        {approving && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[['التاجر', approving.m], ['الخدمة', approving.type], ['الكمية', String(approving.qty)], ['التكلفة التقديرية', money(approving.cost)]].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>التكلفة الفعلية <span className="text-destructive">*</span></Label><Input type="number" step="0.01" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} /></div>
            <div><Label>التاريخ المجدول <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>الموظف المسؤول <span className="text-destructive">*</span></Label>
              <select className={selectCls + ' w-full'} value={form.staff} onChange={e => setForm(f => ({ ...f, staff: e.target.value }))}>
                <option value="">اختر الموظف...</option>
                {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><Label>ملاحظات (اختياري — 300 حرف)</Label><Input value={form.notes} maxLength={300} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
        </>}
      </Modal>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={'رفض طلب الخدمة — ' + (rejecting ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>إلغاء</Button>
          <Button variant="destructive" disabled={reject.isPending} onClick={() => {
            const v = reason.trim()
            if (!v) { setRErr('سبب الرفض مطلوب'); return }
            if (v.length < 10 || v.length > 500) { setRErr('يجب أن يكون سبب الرفض بين 10 و 500 حرف'); return }
            setRErr('')
            reject.mutate({ ref: rejecting!, reason: v })
          }}>تأكيد الرفض</Button>
        </>}>
        <Label>سبب الرفض <span className="text-destructive">*</span> (10 – 500 حرف)</Label>
        <Textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
        {rErr && <p className="mt-1 text-xs font-bold text-destructive">{rErr}</p>}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={'تفاصيل طلب الخدمة — ' + (viewing?.ref ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setViewing(null)}>إغلاق</Button>
        </>}>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['المرجع', viewing.ref],
                ['التاجر', viewing.m],
                ['الخدمة', viewing.type],
                ['المنتج المرتبط', viewing.prod],
                ['الكمية', String(viewing.qty)],
                ['التكلفة التقديرية', money(viewing.cost)],
                ['الإلحاح', viewing.urgency],
                ['التاريخ المفضل', arDate(viewing.date)],
                ['المتطلبات', viewing.req],
                ['الحالة', viewing.status],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2">
                  <p className="text-[11px] font-bold text-muted-foreground">{k}</p>
                  <p className="text-[13px] font-extrabold">{v}</p>
                </div>
              ))}
            </div>
            {viewing.notes && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground">الملاحظات</p>
                <div className="mt-1 rounded-lg border bg-muted/40 p-3 text-sm font-semibold">
                  {viewing.notes}
                </div>
              </div>
            )}
            {viewing.attachment && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground">المرفقات</p>
                <div className="mt-1 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-600">📎 {viewing.attachment}</span>
                    <Button size="sm" variant="outline" onClick={() => toast.success(`تم تحميل المرفق: ${viewing.attachment}`)}>تحميل المرفق</Button>
                  </div>
                </div>
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
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [freq, setFreq] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, freq, page, pageSize: 10 }), [dq, status, freq, page])
  const { data, isLoading } = useQuery({ queryKey: ['subscriptions', qp], queryFn: () => servicesService.subscriptions(qp) })
  const [cancelling, setCancelling] = useState<Subscription | null>(null)
  const cancel = useMutation({ mutationFn: (id: string) => servicesService.cancelSubscription(id), onSuccess: () => { toast.success('تم إلغاء الاشتراك بنجاح'); qc.invalidateQueries({ queryKey: ['subscriptions'] }); setCancelling(null) } })
  const columns: ColumnDef<Subscription, unknown>[] = [
    { accessorKey: 'id', header: 'الاشتراك', cell: ({ row }) => <b>{row.original.id}</b> },
    { accessorKey: 'm', header: 'التاجر' },
    { accessorKey: 'type', header: 'الخدمة' },
    { id: 'cost', header: 'تكلفة الدورة', cell: ({ row }) => money(row.original.cost) },
    { id: 'freq', header: 'الدورية', cell: ({ row }) => <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-700">{row.original.freq}</span> },
    { id: 'next', header: 'الفوترة القادمة', cell: ({ row }) => arDate(row.original.next) },
    { id: 'total', header: 'إجمالي المفوتر', cell: ({ row }) => money(row.original.total) },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => row.original.status === 'نشط' ? <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setCancelling(row.original)}>إلغاء</Button> : null },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        getRowClassName={r => (r.status === 'فشل الدفع' ? 'bg-red-50/60' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث بالتاجر أو الخدمة..." className="pe-9" aria-label="بحث في الاشتراكات" />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              {['نشط', 'ملغي', 'فشل الدفع'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={selectCls} value={freq} onChange={e => { setFreq(e.target.value); setPage(1) }} aria-label="تصفية حسب الدورية">
              <option value="">كل الدوريات</option>
              {['شهري', 'ربع سنوي', 'أسبوعي', 'سنوي'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <p className="ms-auto text-xs font-semibold text-muted-foreground">اشتراكات فشل الدفع مميزة بالأحمر (CR-004)</p>
          </div>
        } />
      <ConfirmDialog open={!!cancelling} onOpenChange={v => { if (!v) setCancelling(null) }} destructive title="إلغاء الاشتراك" loading={cancel.isPending}
        description={'هل أنت متأكد من إلغاء اشتراك ' + (cancelling?.type ?? '') + ' للتاجر ' + (cancelling?.m ?? '') + '؟ لن تُطبق أي رسوم مستقبلية.'}
        confirmLabel="إلغاء الاشتراك" onConfirm={() => cancel.mutate(cancelling!.id)} />
    </div>
  )
}
export function ServiceTypesPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, page, pageSize: 10 }), [dq, page])
  const { data, isLoading } = useQuery({ queryKey: ['service-types', qp], queryFn: () => servicesService.types(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['service-types'] })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const [form, setForm] = useState<ServiceType>({ name: '', desc: '', cost: 0, unit: 'لكل قطعة', prod: 'نعم', status: 'نشط', model: 'دفعة واحدة', freq: '—' })
  const [fErr, setFErr] = useState('')
  const save = useMutation({ mutationFn: () => servicesService.saveType(form, editing?.name), onSuccess: () => { toast.success(editing ? 'تم تحديث نوع الخدمة بنجاح' : 'تم إنشاء نوع الخدمة بنجاح'); invalidate(); setOpen(false) }, onError: e => toast.error((e as Error).message) })
  const toggle = useMutation({ mutationFn: (name: string) => servicesService.toggleType(name), onSuccess: m => { toast.success(m); invalidate() } })
  const submit = () => {
    if (form.name.length < 3 || form.name.length > 100) { setFErr('يجب أن يكون اسم الخدمة بين 3 و 100 حرف'); return }
    if (form.desc.length < 10 || form.desc.length > 500) { setFErr('يجب أن يكون وصف الخدمة بين 10 و 500 حرف'); return }
    if (isNaN(form.cost) || form.cost < 0 || form.cost > 100000) { setFErr('التكلفة الأساسية مطلوبة (0 – 100,000)'); return }
    if (form.model === 'متكرر' && form.freq === '—') { setFErr('دورية الفوترة مطلوبة للنموذج المتكرر'); return }
    setFErr('')
    save.mutate()
  }
  const columns: ColumnDef<ServiceType, unknown>[] = [
    { accessorKey: 'name', header: 'اسم الخدمة', cell: ({ row }) => <b>{row.original.name}</b> },
    { accessorKey: 'desc', header: 'الوصف', cell: ({ row }) => <span className="block max-w-[280px] truncate">{row.original.desc}</span> },
    { id: 'cost', header: 'التكلفة الأساسية', cell: ({ row }) => money(row.original.cost) },
    { accessorKey: 'unit', header: 'وحدة التكلفة' },
    { id: 'model', header: 'نموذج الدفع', cell: ({ row }) => <StatusBadge value={row.original.model} /> },
    { id: 'freq', header: 'الدورية', cell: ({ row }) => row.original.freq === '—' ? '—' : <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-700">{row.original.freq}</span> },
    { accessorKey: 'prod', header: 'يتطلب منتجًا' },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => { setEditing(row.original); setForm(row.original); setFErr(''); setOpen(true) }}>تعديل</Button>
        <Button size="sm" variant="outline" onClick={() => toggle.mutate(row.original.name)}>{row.original.status === 'نشط' ? 'تعطيل' : 'تفعيل'}</Button>
      </div>) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.name}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث في أنواع الخدمات..." className="pe-9" aria-label="بحث في أنواع الخدمات" />
            </div>
            <Button size="sm" className="ms-auto" onClick={() => { setEditing(null); setForm({ name: '', desc: '', cost: 0, unit: 'لكل قطعة', prod: 'نعم', status: 'نشط', model: 'دفعة واحدة', freq: '—' }); setFErr(''); setOpen(true) }}>إنشاء نوع خدمة</Button>
          </div>
        } />
      <Modal open={open} onClose={() => setOpen(false)} wide title={editing ? 'تعديل نوع الخدمة' : 'إنشاء نوع خدمة جديد'}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button disabled={save.isPending} onClick={submit}>حفظ</Button>
        </>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>اسم الخدمة (3 – 100 حرف) <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="md:col-span-2"><Label>وصف الخدمة (10 – 500 حرف) <span className="text-destructive">*</span></Label><Textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /></div>
          <div><Label>التكلفة الأساسية (0 – 100,000) <span className="text-destructive">*</span></Label><Input type="number" step="0.01" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} /></div>
          <div><Label>وحدة التكلفة <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select></div>
          <div><Label>نموذج الدفع (CR-004) <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value as ServiceType['model'], freq: e.target.value === 'متكرر' ? 'شهري' : '—' }))}>
              <option value="دفعة واحدة">دفعة واحدة</option>
              <option value="متكرر">متكرر</option>
            </select></div>
          {form.model === 'متكرر' && <div><Label>دورية الفوترة <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value }))}>
              {['أسبوعي', 'شهري', 'ربع سنوي', 'سنوي'].map(f => <option key={f} value={f}>{f}</option>)}
            </select></div>}
          <div><Label>يتطلب منتجًا <span className="text-destructive">*</span></Label>
            <div className="flex gap-5 pt-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.prod === 'نعم'} onChange={() => setForm(f => ({ ...f, prod: 'نعم' }))} /> نعم</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.prod === 'لا'} onChange={() => setForm(f => ({ ...f, prod: 'لا' }))} /> لا</label>
            </div></div>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
    </div>
  )
}
