import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/tables/data-table'
import { Modal, StatusBadge, selectCls } from '@/components/common'
import { approvalsService } from '@/services/approvals.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, todayISO } from '@/lib/utils'
import type { Approval } from '@/types'
import { Search } from 'lucide-react'
const TYPES = ['تأهيل تاجر', 'إضافة مخزون', 'سحب مخزون', 'طلب إرجاع', 'طلب سحب مالي', 'طلب خدمة']
const CATEGORIES = ['معلومات غير كافية', 'مخالفة للسياسة', 'طلب غير صالح', 'طلب مكرر', 'تجاوز الميزانية', 'أخرى']
const APPROVERS = ['منى المطيري', 'خالد العتيق', 'عبدالله السالم']
const STAFF = ['سعود الفهد', 'ماجد العوفي', 'وليد حسن']
export default function ApprovalsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState(''); const [type, setType] = useState(''); const [urgency, setUrgency] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, urgency, page, pageSize: 10 }), [dq, type, urgency, page])
  const { data, isLoading } = useQuery({ queryKey: ['approvals', qp], queryFn: () => approvalsService.list(qp) })
  const { data: dash } = useQuery({ queryKey: ['approvals-dash'], queryFn: () => approvalsService.dashboard(), refetchInterval: 60_000 })
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['approvals'] }); qc.invalidateQueries({ queryKey: ['approvals-dash'] }) }
  const [approving, setApproving] = useState<Approval | null>(null)
  const [aForm, setAForm] = useState({ notes: '', qty: 0, cost: 0, date: todayISO(), staff: '' })
  const [aErr, setAErr] = useState('')
  const [rejecting, setRejecting] = useState<Approval | null>(null)
  const [rForm, setRForm] = useState({ reason: '', category: '', resubmit: 'نعم' })
  const [rErr, setRErr] = useState('')
  const [infoFor, setInfoFor] = useState<Approval | null>(null)
  const [iForm, setIForm] = useState({ info: '', deadline: '' })
  const [iErr, setIErr] = useState('')
  const [assignFor, setAssignFor] = useState<Approval | null>(null)
  const [asForm, setAsForm] = useState({ approver: '', reason: '' })
  const [asErr, setAsErr] = useState('')
  const approve = useMutation({ mutationFn: (v: { id: string; extra: typeof aForm }) => approvalsService.approve(v.id, v.extra), onSuccess: () => { toast.success('تمت الموافقة على الطلب بنجاح'); invalidate(); setApproving(null) } })
  const reject = useMutation({ mutationFn: (v: { id: string; r: typeof rForm }) => approvalsService.reject(v.id, v.r), onSuccess: () => { toast.success('تم رفض الطلب بنجاح'); invalidate(); setRejecting(null) } })
  const reqInfo = useMutation({ mutationFn: (v: { id: string; info: string; deadline: string }) => approvalsService.requestInfo(v.id, v.info, v.deadline), onSuccess: () => { toast.success('تم إرسال طلب المعلومات بنجاح'); invalidate(); setInfoFor(null) } })
  const assign = useMutation({ mutationFn: (v: { id: string; approver: string; reason: string }) => approvalsService.assign(v.id, v.approver, v.reason), onSuccess: () => { toast.success('تم إسناد الموافقة بنجاح'); invalidate(); setAssignFor(null) } })
  const cards = dash ? [
    { l: 'إجمالي المعلقة', v: dash.total, onClick: () => { setType(''); setUrgency(''); setPage(1) } },
    { l: 'تأهيل تجار', v: dash.onboarding, onClick: () => { setType('تأهيل تاجر'); setUrgency(''); setPage(1) } },
    { l: 'إضافة مخزون', v: dash.stockAdd, onClick: () => { setType('إضافة مخزون'); setUrgency(''); setPage(1) } },
    { l: 'سحب مخزون', v: dash.stockRemove, onClick: () => { setType('سحب مخزون'); setUrgency(''); setPage(1) } },
    { l: 'مرتجعات', v: dash.returns, onClick: () => { setType('طلب إرجاع'); setUrgency(''); setPage(1) } },
    { l: 'سحب مالي', v: dash.withdrawals, onClick: () => { setType('طلب سحب مالي'); setUrgency(''); setPage(1) } },
    { l: 'خدمات', v: dash.services, onClick: () => { setType('طلب خدمة'); setUrgency(''); setPage(1) } },
    { l: 'حرجة / عاجلة', v: dash.critical, onClick: () => { setType(''); setUrgency('critical'); setPage(1) }, hot: true },
  ] : []
  const columns: ColumnDef<Approval, unknown>[] = [
    { accessorKey: 'id', header: 'المعرف', cell: ({ row }) => <b>{row.original.id}</b> },
    { id: 'type', header: 'النوع', cell: ({ row }) => <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold text-blue-700">{row.original.type}</span> },
    { accessorKey: 'who', header: 'مقدم الطلب' },
    { accessorKey: 'title', header: 'الوصف', cell: ({ row }) => <span className="block max-w-[260px] truncate">{row.original.title}</span> },
    { id: 'urgency', header: 'الإلحاح', cell: ({ row }) => <StatusBadge value={row.original.urgency} /> },
    { id: 'date', header: 'تاريخ الطلب', cell: ({ row }) => arDate(row.original.date) },
    { id: 'days', header: 'أيام التعليق', cell: ({ row }) => <span className={row.original.days > 3 ? 'font-black text-destructive' : 'font-bold'}>{row.original.days} {row.original.days > 3 && '⚠'}</span> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => { setApproving(row.original); setAForm({ notes: '', qty: row.original.qty ?? 0, cost: 0, date: todayISO(), staff: '' }); setAErr('') }}>اعتماد</Button>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setRejecting(row.original); setRForm({ reason: '', category: '', resubmit: 'نعم' }); setRErr('') }}>رفض</Button>
        <Button size="sm" variant="outline" onClick={() => { setInfoFor(row.original); setIForm({ info: '', deadline: '' }); setIErr('') }}>معلومات</Button>
        <Button size="sm" variant="outline" onClick={() => { setAssignFor(row.original); setAsForm({ approver: '', reason: '' }); setAsErr('') }}>إسناد</Button>
      </div>) },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {cards.map(c => (
          <button key={c.l} onClick={c.onClick} className={c.hot ? 'rounded-xl border border-destructive/40 bg-card p-3 text-start shadow-sm' : 'rounded-xl border bg-card p-3 text-start shadow-sm'}>
            <p className="text-lg font-black">{c.v}</p>
            <p className="text-[11px] font-bold text-muted-foreground">{c.l}</p>
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
          toolbar={
            <div className="flex flex-wrap items-center gap-2 border-b p-3">
              <div className="relative min-w-[220px] flex-1 md:max-w-xs">
                <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث بالمعرف أو النوع أو مقدم الطلب..." className="pe-9" aria-label="بحث في الموافقات" />
              </div>
              <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label="تصفية حسب النوع">
                <option value="">كل الأنواع</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className={selectCls} value={urgency} onChange={e => { setUrgency(e.target.value); setPage(1) }} aria-label="تصفية حسب الإلحاح">
                <option value="">كل مستويات الإلحاح</option>
                <option value="critical">حرجة / عاجلة</option>
                {['عادي', 'عاجل', 'حرج'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <p className="ms-auto text-xs font-semibold text-muted-foreground">الفرز: الإلحاح ثم الأقدم — الأحمر = معلق أكثر من 3 أيام</p>
            </div>
          } />
      </div>
      <Modal open={!!approving} onClose={() => setApproving(null)} title={'اعتماد — ' + (approving?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setApproving(null)}>إلغاء</Button>
          <Button disabled={approve.isPending} onClick={() => {
            const a = approving!
            if ((a.type === 'إضافة مخزون' || a.type === 'سحب مخزون')) {
              if (!aForm.qty || aForm.qty < 1) { setAErr('الكمية المعتمدة مطلوبة (1 على الأقل)'); return }
              if (a.qty && aForm.qty > a.qty) { setAErr('الكمية المعتمدة يجب أن تكون أقل من أو تساوي الكمية المطلوبة'); return }
            }
            if (a.type === 'طلب خدمة') {
              if (!aForm.cost || aForm.cost < 0.01) { setAErr('التكلفة الفعلية مطلوبة (0.01 على الأقل)'); return }
              if (aForm.cost > 100000) { setAErr('التكلفة الفعلية يجب أن تكون أقل من 100,000'); return }
              if (aForm.date < todayISO()) { setAErr('التاريخ المجدول يجب أن يكون اليوم أو مستقبلًا'); return }
              if (!aForm.staff) { setAErr('الموظف المسؤول مطلوب'); return }
            }
            if (aForm.notes.length > 300) { setAErr('ملاحظات الاعتماد يجب أن تكون أقل من 300 حرف'); return }
            setAErr('')
            approve.mutate({ id: a.id, extra: aForm })
          }}>تأكيد الاعتماد</Button>
        </>}>
        {approving && <>
          <p className="mb-3 text-sm font-bold">{approving.title}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {(approving.type === 'إضافة مخزون' || approving.type === 'سحب مخزون') && (
              <div><Label>الكمية المعتمدة (بحد أقصى {approving.qty ?? '—'}) <span className="text-destructive">*</span></Label><Input type="number" min={1} value={aForm.qty || ''} onChange={e => setAForm(f => ({ ...f, qty: +e.target.value }))} /></div>
            )}
            {approving.type === 'طلب خدمة' && <>
              <div><Label>التكلفة الفعلية <span className="text-destructive">*</span></Label><Input type="number" step="0.01" value={aForm.cost || ''} onChange={e => setAForm(f => ({ ...f, cost: +e.target.value }))} /></div>
              <div><Label>التاريخ المجدول <span className="text-destructive">*</span></Label><Input type="date" value={aForm.date} onChange={e => setAForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>الموظف المسؤول <span className="text-destructive">*</span></Label>
                <select className={selectCls + ' w-full'} value={aForm.staff} onChange={e => setAForm(f => ({ ...f, staff: e.target.value }))}>
                  <option value="">اختر الموظف...</option>
                  {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
            </>}
            <div className="md:col-span-2"><Label>ملاحظات الاعتماد (اختياري — 300 حرف)</Label><Textarea value={aForm.notes} maxLength={300} onChange={e => setAForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          {aErr && <p className="mt-2 text-xs font-bold text-destructive">{aErr}</p>}
        </>}
      </Modal>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={'رفض — ' + (rejecting?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>إلغاء</Button>
          <Button variant="destructive" disabled={reject.isPending} onClick={() => {
            const v = rForm.reason.trim()
            if (!v) { setRErr('سبب الرفض مطلوب'); return }
            if (v.length < 10 || v.length > 500) { setRErr('يجب أن يكون سبب الرفض بين 10 و 500 حرف'); return }
            if (!rForm.category) { setRErr('تصنيف الرفض مطلوب'); return }
            setRErr('')
            reject.mutate({ id: rejecting!.id, r: rForm })
          }}>تأكيد الرفض</Button>
        </>}>
        <div className="grid gap-3">
          <div><Label>سبب الرفض <span className="text-destructive">*</span> (10 – 500 حرف)</Label><Textarea value={rForm.reason} maxLength={500} onChange={e => setRForm(f => ({ ...f, reason: e.target.value }))} /></div>
          <div><Label>تصنيف الرفض <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={rForm.category} onChange={e => setRForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">اختر التصنيف...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><Label>السماح بإعادة التقديم <span className="text-destructive">*</span></Label>
            <div className="flex gap-5 pt-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={rForm.resubmit === 'نعم'} onChange={() => setRForm(f => ({ ...f, resubmit: 'نعم' }))} /> نعم</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={rForm.resubmit === 'لا'} onChange={() => setRForm(f => ({ ...f, resubmit: 'لا' }))} /> لا</label>
            </div></div>
        </div>
        {rErr && <p className="mt-2 text-xs font-bold text-destructive">{rErr}</p>}
      </Modal>
      <Modal open={!!infoFor} onClose={() => setInfoFor(null)} title={'طلب معلومات — ' + (infoFor?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setInfoFor(null)}>إلغاء</Button>
          <Button disabled={reqInfo.isPending} onClick={() => {
            const v = iForm.info.trim()
            if (!v) { setIErr('المعلومات المطلوبة مطلوبة'); return }
            if (v.length < 10 || v.length > 500) { setIErr('يجب أن تكون المعلومات بين 10 و 500 حرف'); return }
            if (!iForm.deadline) { setIErr('الموعد النهائي مطلوب'); return }
            if (iForm.deadline < todayISO()) { setIErr('الموعد النهائي يجب أن يكون اليوم أو مستقبلًا'); return }
            setIErr('')
            reqInfo.mutate({ id: infoFor!.id, info: v, deadline: iForm.deadline })
          }}>إرسال الطلب</Button>
        </>}>
        <div className="grid gap-3">
          <div><Label>المعلومات المطلوبة <span className="text-destructive">*</span> (10 – 500 حرف)</Label><Textarea value={iForm.info} maxLength={500} onChange={e => setIForm(f => ({ ...f, info: e.target.value }))} /></div>
          <div><Label>الموعد النهائي للاستجابة <span className="text-destructive">*</span></Label><Input type="date" value={iForm.deadline} onChange={e => setIForm(f => ({ ...f, deadline: e.target.value }))} /></div>
        </div>
        {iErr && <p className="mt-2 text-xs font-bold text-destructive">{iErr}</p>}
      </Modal>
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title={'إسناد — ' + (assignFor?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setAssignFor(null)}>إلغاء</Button>
          <Button disabled={assign.isPending} onClick={() => {
            if (!asForm.approver) { setAsErr('المعتمد الجديد مطلوب'); return }
            const v = asForm.reason.trim()
            if (!v) { setAsErr('سبب الإسناد مطلوب'); return }
            if (v.length < 10 || v.length > 300) { setAsErr('يجب أن يكون سبب الإسناد بين 10 و 300 حرف'); return }
            setAsErr('')
            assign.mutate({ id: assignFor!.id, approver: asForm.approver, reason: v })
          }}>تأكيد الإسناد</Button>
        </>}>
        <div className="grid gap-3">
          <div><Label>المعتمد الجديد <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={asForm.approver} onChange={e => setAsForm(f => ({ ...f, approver: e.target.value }))}>
              <option value="">اختر المعتمد...</option>
              {APPROVERS.map(a => <option key={a} value={a}>{a}</option>)}
            </select></div>
          <div><Label>سبب الإسناد <span className="text-destructive">*</span> (10 – 300 حرف)</Label><Textarea value={asForm.reason} maxLength={300} onChange={e => setAsForm(f => ({ ...f, reason: e.target.value }))} /></div>
        </div>
        {asErr && <p className="mt-2 text-xs font-bold text-destructive">{asErr}</p>}
      </Modal>
    </div>
  )
}
