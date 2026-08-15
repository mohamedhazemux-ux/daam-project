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
import { financeService } from '@/services/finance.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV, money } from '@/lib/utils'
import type { Invoice, Wallet, Withdrawal } from '@/types'
import { Search } from 'lucide-react'
import { printInvoicePDF } from '@/lib/pdf-utils'

/* ---------- طلبات السحب المعلقة ---------- */
export function WithdrawalsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, page, pageSize: 10 }), [dq, status, page])
  const { data, isLoading } = useQuery({ queryKey: ['withdrawals', qp], queryFn: () => financeService.withdrawals(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['withdrawals'] })

  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [rErr, setRErr] = useState('')
  const [processing, setProcessing] = useState<Withdrawal | null>(null)
  const [pNotes, setPNotes] = useState('')
  const [pErr, setPErr] = useState('')
  const [completing, setCompleting] = useState<Withdrawal | null>(null)
  const [confirmNo, setConfirmNo] = useState('')
  const [cNotes, setCNotes] = useState('')
  const [cErr, setCErr] = useState('')

  const approve = useMutation({ mutationFn: (id: string) => financeService.approveWithdrawal(id), onSuccess: () => { toast.success('تمت الموافقة على طلب السحب بنجاح'); invalidate(); setApproving(null) }, onError: e => toast.error((e as Error).message) })
  const reject = useMutation({ mutationFn: (v: { id: string; reason: string }) => financeService.rejectWithdrawal(v.id, v.reason), onSuccess: () => { toast.success('تم رفض طلب السحب بنجاح — تمت إعادة المبلغ المحجوز إلى الرصيد المتاح للتاجر'); invalidate(); setRejecting(null) } })
  const process = useMutation({ mutationFn: (v: { id: string; notes: string }) => financeService.processPayment(v.id, v.notes), onSuccess: ref => { toast.success('تم تنفيذ الدفع بنجاح، مرجع العملية: ' + ref); invalidate(); setProcessing(null) }, onError: e => toast.error((e as Error).message) })
  const complete = useMutation({ mutationFn: (v: { id: string; confirmNo: string }) => financeService.completeWithdrawal(v.id, v.confirmNo), onSuccess: () => { toast.success('تم اكتمال السحب بنجاح — تم إرسال بريد التأكيد للتاجر'); invalidate(); setCompleting(null) }, onError: e => toast.error((e as Error).message) })

  const columns: ColumnDef<Withdrawal, unknown>[] = [
    { accessorKey: 'id', header: 'رقم الطلب', cell: ({ row }) => <b>{row.original.id}</b> },
    { id: 'merchant', header: 'التاجر', cell: ({ row }) => <div><p className="font-bold">{row.original.m}</p><p className="text-[11px] text-muted-foreground">{row.original.email}</p></div> },
    { id: 'amount', header: 'المبلغ', cell: ({ row }) => <b>{money(row.original.amount)}</b> },
    { accessorKey: 'method', header: 'الطريقة' },
    { accessorKey: 'bank', header: 'الحساب البنكي', cell: ({ row }) => <span dir="ltr">{row.original.bank}</span> },
    { id: 'date', header: 'تاريخ الطلب', cell: ({ row }) => arDate(row.original.date) },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => { const w = row.original; return (
      <div className="flex gap-1">
        {w.status === 'معلق' && <>
          <Button size="sm" variant="outline" onClick={() => setApproving(w.id)}>اعتماد</Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setRejecting(w.id); setReason(''); setRErr('') }}>رفض</Button>
        </>}
        {w.status === 'معتمد' && <Button size="sm" variant="outline" onClick={() => { setProcessing(w); setPNotes(''); setPErr('') }}>تنفيذ الدفع</Button>}
        {w.status === 'قيد التنفيذ' && <Button size="sm" variant="outline" onClick={() => { setCompleting(w); setConfirmNo(''); setCNotes(''); setCErr('') }}>تأكيد الاكتمال</Button>}
      </div>) } },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث برقم الطلب أو التاجر..." className="pe-9" aria-label="بحث في طلبات السحب" />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              {['معلق', 'معتمد', 'قيد التنفيذ', 'مكتمل', 'مرفوض'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="ms-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">{(data?.rows ?? []).filter(w => w.status === 'معلق').length} طلب بانتظار المراجعة</span>
          </div>
        } />

      <ConfirmDialog open={!!approving} onOpenChange={v => { if (!v) setApproving(null) }} title="اعتماد طلب السحب" loading={approve.isPending}
        description={'هل أنت متأكد من اعتماد طلب السحب ' + (approving ?? '') + '؟ سيتم إرسال إشعار الاعتماد للتاجر وتحويل الطلب لقائمة تنفيذ الدفع.'}
        confirmLabel="اعتماد" onConfirm={() => approve.mutate(approving!)} />

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={'رفض طلب السحب — ' + (rejecting ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>إلغاء</Button>
          <Button variant="destructive" disabled={reject.isPending} onClick={() => {
            const v = reason.trim()
            if (!v) { setRErr('سبب الرفض مطلوب'); return }
            if (v.length < 10 || v.length > 500) { setRErr('يجب أن يكون سبب الرفض بين 10 و 500 حرف'); return }
            setRErr('')
            reject.mutate({ id: rejecting!, reason: v })
          }}>تأكيد الرفض</Button>
        </>}>
        <Label>سبب الرفض <span className="text-destructive">*</span> (10 – 500 حرف)</Label>
        <Textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
        {rErr && <p className="mt-1 text-xs font-bold text-destructive">{rErr}</p>}
      </Modal>

      <Modal open={!!processing} onClose={() => setProcessing(null)} title={'تنفيذ الدفع — ' + (processing?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setProcessing(null)}>إلغاء</Button>
          <Button disabled={process.isPending} onClick={() => {
            if (pNotes.length > 300) { setPErr('ملاحظات الدفع يجب أن تكون أقل من 300 حرف'); return }
            setPErr('')
            process.mutate({ id: processing!.id, notes: pNotes })
          }}>تأكيد الدفع</Button>
        </>}>
        {processing && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[['التاجر', processing.m], ['المبلغ', money(processing.amount)], ['الطريقة', processing.method], ['مرجع العملية (تلقائي)', 'PMT-' + String(1).padStart(3, '0')]].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs font-bold text-muted-foreground">
            تفاصيل الحساب البنكي (كاملة — تظهر لمدير المالية فقط):<br />
            البنك: مصرف الراجحي — صاحب الحساب: {processing.m} — الآيبان: <span dir="ltr">SA4420000001234567891234</span>
          </div>
          <div className="mt-3"><Label>ملاحظات الدفع (اختياري — 300 حرف)</Label><Textarea value={pNotes} maxLength={300} onChange={e => setPNotes(e.target.value)} /></div>
          {pErr && <p className="mt-1 text-xs font-bold text-destructive">{pErr}</p>}
        </>}
      </Modal>

      <Modal open={!!completing} onClose={() => setCompleting(null)} title={'تأكيد الاكتمال — ' + (completing?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setCompleting(null)}>إلغاء</Button>
          <Button disabled={complete.isPending} onClick={() => {
            if (confirmNo.length > 100) { setCErr('رقم التأكيد يجب أن يكون أقل من 100 حرف'); return }
            if (cNotes.length > 300) { setCErr('ملاحظات الاكتمال يجب أن تكون أقل من 300 حرف'); return }
            setCErr('')
            complete.mutate({ id: completing!.id, confirmNo })
          }}>تأكيد الاكتمال</Button>
        </>}>
        {completing && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[['التاجر', completing.m], ['المبلغ', money(completing.amount)]].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="grid gap-3">
            <div><Label>رقم تأكيد التحويل البنكي (اختياري — 100 حرف)</Label><Input value={confirmNo} maxLength={100} onChange={e => setConfirmNo(e.target.value)} /></div>
            <div><Label>ملاحظات (اختياري — 300 حرف)</Label><Textarea value={cNotes} maxLength={300} onChange={e => setCNotes(e.target.value)} /></div>
          </div>
          {cErr && <p className="mt-1 text-xs font-bold text-destructive">{cErr}</p>}
        </>}
      </Modal>
    </div>
  )
}

/* ---------- محافظ التجار ---------- */
export function WalletsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, page, pageSize: 10 }), [dq, status, page])
  const { data, isLoading } = useQuery({ queryKey: ['wallets', qp], queryFn: () => financeService.wallets(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['wallets'] })

  const [adjusting, setAdjusting] = useState<Wallet | null>(null)
  const [form, setForm] = useState({ type: 'إيداع (إضافة للرصيد)', amount: 0, reason: '', notes: '' })
  const [fErr, setFErr] = useState('')
  const [confirmStep, setConfirmStep] = useState(false)

  const adjust = useMutation({
    mutationFn: () => financeService.adjustWallet(adjusting!.m, form.type.startsWith('إيداع') ? 'credit' : 'debit', form.amount, form.reason, form.notes),
    onSuccess: bal => { toast.success('تم تعديل المحفظة بنجاح، الرصيد الجديد: ' + money(bal)); invalidate(); setAdjusting(null); setConfirmStep(false) },
    onError: e => toast.error((e as Error).message),
  })

  const validate = () => {
    if (!form.amount || isNaN(form.amount)) { setFErr('مبلغ التعديل مطلوب'); return }
    if (form.amount < 0.01) { setFErr('يجب أن يكون مبلغ التعديل 0.01 على الأقل'); return }
    if (form.amount > 100000) { setFErr('يجب أن يكون مبلغ التعديل أقل من 100,000'); return }
    if (form.type.startsWith('خصم') && adjusting && form.amount > adjusting.bal) { setFErr('يجب أن يكون مبلغ التعديل أقل من أو يساوي الرصيد الحالي'); return }
    if (!form.reason) { setFErr('سبب التعديل مطلوب'); return }
    if (form.notes.length > 500) { setFErr('ملاحظات التعديل يجب أن تكون أقل من 500 حرف'); return }
    setFErr('')
    setConfirmStep(true)
  }

  const columns: ColumnDef<Wallet, unknown>[] = [
    { id: 'merchant', header: 'التاجر', cell: ({ row }) => <div><p className="font-bold">{row.original.m}</p><p className="text-[11px] text-muted-foreground">{row.original.email}</p></div> },
    { id: 'bal', header: 'الرصيد الحالي', cell: ({ row }) => <span className={row.original.bal < 0 ? 'font-black text-destructive' : 'font-bold'}>{money(row.original.bal)}</span> },
    { id: 'res', header: 'المحجوز', cell: ({ row }) => money(row.original.res) },
    { id: 'avail', header: 'المتاح', cell: ({ row }) => money(row.original.bal - row.original.res) },
    { id: 'credits', header: 'إجمالي الإيداعات', cell: ({ row }) => money(row.original.credits) },
    { id: 'debits', header: 'إجمالي السحوبات', cell: ({ row }) => money(row.original.debits) },
    { id: 'last', header: 'آخر عملية', cell: ({ row }) => arDate(row.original.last) },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => <Button size="sm" variant="outline" onClick={() => { setAdjusting(row.original); setForm({ type: 'إيداع (إضافة للرصيد)', amount: 0, reason: '', notes: '' }); setFErr(''); setConfirmStep(false) }}>تعديل يدوي</Button> },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.m}
        getRowClassName={r => (r.bal < 0 ? 'bg-red-50/60' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث بالتاجر أو البريد..." className="pe-9" aria-label="بحث في المحافظ" />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              {['نشط', 'موقوف', 'مجمّد'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="ms-auto text-xs font-semibold text-muted-foreground">المحافظ ذات الرصيد السالب تظهر باللون الأحمر</p>
          </div>
        } />

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={'تعديل يدوي للمحفظة — ' + (adjusting?.m ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setAdjusting(null)}>إلغاء</Button>
          {!confirmStep
            ? <Button onClick={validate}>متابعة</Button>
            : <Button disabled={adjust.isPending} onClick={() => adjust.mutate()}>تأكيد التعديل</Button>}
        </>}>
        {adjusting && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">التاجر</p><p className="text-[13px] font-extrabold">{adjusting.m}</p></div>
            <div className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">الرصيد الحالي</p><p className="text-[13px] font-extrabold">{money(adjusting.bal)}</p></div>
          </div>
          {!confirmStep ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>نوع التعديل <span className="text-destructive">*</span></Label>
                <select className={selectCls + ' w-full'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="إيداع (إضافة للرصيد)">إيداع (إضافة للرصيد)</option>
                  <option value="خصم (اقتطاع من الرصيد)">خصم (اقتطاع من الرصيد)</option>
                </select></div>
              <div><Label>مبلغ التعديل (0.01 – 100,000) <span className="text-destructive">*</span></Label><Input type="number" step="0.01" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} /></div>
              <div><Label>سبب التعديل <span className="text-destructive">*</span></Label>
                <select className={selectCls + ' w-full'} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                  <option value="">اختر السبب...</option>
                  {['تصحيح', 'مكافأة', 'غرامة', 'تعويض', 'أخرى'].map(r => <option key={r} value={r}>{r}</option>)}
                </select></div>
              <div><Label>ملاحظات (اختياري — 500 حرف)</Label><Input value={form.notes} maxLength={500} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
          ) : (
            <p className="rounded-lg border bg-muted/50 p-4 text-sm font-bold">
              هل أنت متأكد من {form.type.startsWith('خصم') ? 'خصم' : 'إيداع'} <b>{money(form.amount)}</b> {form.type.startsWith('خصم') ? 'من' : 'إلى'} محفظة <b>{adjusting.m}</b>؟
            </p>
          )}
          {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
        </>}
      </Modal>
    </div>
  )
}

/* ---------- الفواتير الشهرية الموحدة (CR-005) ---------- */
export function InvoicesPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, page, pageSize: 10 }), [dq, status, page])
  const { data, isLoading } = useQuery({ queryKey: ['invoices', qp], queryFn: () => financeService.invoices(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['invoices'] })

  const [viewing, setViewing] = useState<Invoice | null>(null)
  const [resending, setResending] = useState<string | null>(null)
  const resend = useMutation({ mutationFn: (ref: string) => financeService.resendInvoice(ref), onSuccess: () => { toast.success('تم إرسال الفاتورة بنجاح'); invalidate(); setResending(null) } })
  const markPaid = useMutation({ mutationFn: (ref: string) => financeService.markPaid(ref), onSuccess: () => { toast.success('تم تحديد الفاتورة كمدفوعة بنجاح'); invalidate() } })

  const columns: ColumnDef<Invoice, unknown>[] = [
    { accessorKey: 'ref', header: 'مرجع الفاتورة', cell: ({ row }) => <b dir="ltr">{row.original.ref}</b> },
    { accessorKey: 'm', header: 'التاجر' },
    { accessorKey: 'period', header: 'الفترة' },
    { id: 'total', header: 'المبلغ المستحق', cell: ({ row }) => <b>{money(row.original.total)}</b> },
    { id: 'due', header: 'الاستحقاق', cell: ({ row }) => arDate(row.original.due) },
    { id: 'gen', header: 'تاريخ الإنشاء', cell: ({ row }) => arDate(row.original.gen) },
    { id: 'sent', header: 'تاريخ الإرسال', cell: ({ row }) => arDate(row.original.sent) },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => setViewing(row.original)}>عرض</Button>
        <Button size="sm" variant="outline" onClick={() => setResending(row.original.ref)}>إعادة إرسال</Button>
        {row.original.status !== 'مدفوعة' && <Button size="sm" variant="outline" onClick={() => markPaid.mutate(row.original.ref)}>تحديد كمدفوعة</Button>}
      </div>) },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        getRowClassName={r => (r.status === 'متأخرة' ? 'bg-red-50/60' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث بمرجع الفاتورة أو التاجر..." className="pe-9" aria-label="بحث في الفواتير" />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              {['تم الإنشاء', 'مرسلة', 'مستعرضة', 'مدفوعة', 'متأخرة'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('invoices', ['المرجع', 'التاجر', 'الفترة', 'الإجمالي', 'الاستحقاق', 'الحالة'], (data?.rows ?? []).map(i => [i.ref, i.m, i.period, i.total, i.due, i.status])); toast.success('تم تصدير الملف بنجاح') }}>تصدير</Button>
          </div>
        } />

      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={'تفاصيل الفاتورة — ' + (viewing?.ref ?? '')}
        footer={<Button variant="outline" onClick={() => {
          if (viewing) {
            printInvoicePDF({
              reference: viewing.ref,
              period: viewing.period,
              merchantName: viewing.m,
              merchantEmail: viewing.email,
              items: [
                { description: 'رسوم تنفيذ الطلبات', quantity: 24, unitPrice: (viewing.total * 0.5) / 24, total: viewing.total * 0.5 },
                { description: 'رسوم الخدمات المساندة', quantity: 3, unitPrice: (viewing.total * 0.3) / 3, total: viewing.total * 0.3 },
                { description: 'تكاليف شحن المنصة', quantity: 12, unitPrice: (viewing.total * 0.14) / 12, total: viewing.total * 0.14 },
              ],
              subtotal: viewing.total / 1.15,
              tax: viewing.total - (viewing.total / 1.15),
              total: viewing.total,
              dueDate: arDate(viewing.due),
              createdAt: arDate(viewing.gen),
              status: viewing.status,
            })
            toast.success('جارٍ تجهيز وحفظ الفاتورة بصيغة PDF')
          }
        }}>طباعة / تنزيل PDF</Button>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[['التاجر', viewing.m], ['الفترة', viewing.period], ['الحالة', <StatusBadge key="s" value={viewing.status} />], ['الاستحقاق', arDate(viewing.due)]].map(([k, v]) => (
              <div key={k as string} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">البند</th><th className="p-2 text-start font-extrabold">الكمية</th><th className="p-2 text-start font-extrabold">المبلغ</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2">رسوم تنفيذ الطلبات</td><td className="p-2">24 طلب</td><td className="p-2">{money(viewing.total * 0.5)}</td></tr>
                <tr className="border-b"><td className="p-2">رسوم الخدمات (دفعة واحدة + متكررة)</td><td className="p-2">3</td><td className="p-2">{money(viewing.total * 0.3)}</td></tr>
                <tr className="border-b"><td className="p-2">تكاليف شحن المنصة</td><td className="p-2">12</td><td className="p-2">{money(viewing.total * 0.14)}</td></tr>
                <tr className="border-b"><td className="p-2">الإجمالي الفرعي</td><td className="p-2" /><td className="p-2">{money(viewing.total / 1.15)}</td></tr>
                <tr className="border-b"><td className="p-2">ضريبة القيمة المضافة (15%)</td><td className="p-2" /><td className="p-2">{money(viewing.total - viewing.total / 1.15)}</td></tr>
                <tr><td className="p-2 font-black">إجمالي المبلغ المستحق</td><td className="p-2" /><td className="p-2 font-black">{money(viewing.total)}</td></tr>
              </tbody>
            </table>
          </div>
        </>}
      </Modal>

      <ConfirmDialog open={!!resending} onOpenChange={v => { if (!v) setResending(null) }} title="إعادة إرسال الفاتورة" loading={resend.isPending}
        description={'هل أنت متأكد من إعادة إرسال الفاتورة ' + (resending ?? '') + ' إلى بريد التاجر؟'}
        confirmLabel="إعادة الإرسال" onConfirm={() => resend.mutate(resending!)} />
    </div>
  )
}
