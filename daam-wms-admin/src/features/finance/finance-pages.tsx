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
import { ActionButtons, AttachmentBadgeList, ConfirmDialog, Modal, StatusBadge, selectCls } from '@/components/common'
import { financeService } from '@/services/finance.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV, money } from '@/lib/utils'
import type { Invoice, Wallet, Withdrawal } from '@/types'
import { CheckCheck, CheckCircle, Download, Edit3, Eye, Mail, Search, Send, XCircle } from 'lucide-react'
import { printInvoicePDF } from '@/lib/pdf-utils'
import { useT } from '@/lib/i18n'

function generateInvoicePdf(invoice: Invoice) {
  const subtotal = invoice.total / 1.15
  const items = [
    { description: 'رسوم تنفيذ الطلبات', quantity: 24, total: invoice.total * 0.5 },
    { description: 'رسوم الخدمات المساندة', quantity: 3, total: invoice.total * 0.3 },
    { description: 'تكاليف شحن المنصة', quantity: 12, total: invoice.total * 0.14 },
  ]
  return printInvoicePDF({
    reference: invoice.ref,
    period: invoice.period,
    merchantName: invoice.m,
    merchantEmail: invoice.email,
    items: items.map(item => ({ ...item, unitPrice: item.total / item.quantity })),
    subtotal,
    tax: invoice.total - subtotal,
    total: invoice.total,
    dueDate: arDate(invoice.due),
    createdAt: arDate(invoice.gen),
    status: invoice.status,
  })
}

/* ---------- طلبات السحب المعلقة ---------- */
export function WithdrawalsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const t = useT()
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
  const [viewing, setViewing] = useState<Withdrawal | null>(null)

  const approve = useMutation({ mutationFn: (id: string) => financeService.approveWithdrawal(id), onSuccess: () => { toast.success(t('تمت الموافقة على طلب السحب بنجاح')); invalidate(); setApproving(null) }, onError: e => toast.error((e as Error).message) })
  const reject = useMutation({ mutationFn: (v: { id: string; reason: string }) => financeService.rejectWithdrawal(v.id, v.reason), onSuccess: () => { toast.success(t('تم رفض طلب السحب بنجاح — تمت إعادة المبلغ المحجوز إلى الرصيد المتاح للتاجر')); invalidate(); setRejecting(null) } })
  const process = useMutation({ mutationFn: (v: { id: string; notes: string }) => financeService.processPayment(v.id, v.notes), onSuccess: ref => { toast.success(t('تم تنفيذ الدفع بنجاح، مرجع العملية: ') + ref); invalidate(); setProcessing(null) }, onError: e => toast.error((e as Error).message) })
  const complete = useMutation({ mutationFn: (v: { id: string; confirmNo: string }) => financeService.completeWithdrawal(v.id, v.confirmNo), onSuccess: () => { toast.success(t('تم اكتمال السحب بنجاح — تم إرسال بريد التأكيد للتاجر')); invalidate(); setCompleting(null) }, onError: e => toast.error((e as Error).message) })

  const columns: ColumnDef<Withdrawal, unknown>[] = [
    { accessorKey: 'id', header: t('رقم الطلب'), cell: ({ row }) => <button className="font-bold underline-offset-4 hover:underline" onClick={() => navigate(`/records/withdrawal/${row.original.id}`)}>{row.original.id}</button> },
    { id: 'merchant', header: t('التاجر'), cell: ({ row }) => <div><p className="font-bold">{row.original.m}</p><p className="text-[11px] text-muted-foreground">{row.original.email}</p></div> },
    { id: 'amount', header: t('المبلغ'), cell: ({ row }) => <b>{money(row.original.amount)}</b> },
    { accessorKey: 'method', header: t('الطريقة'), cell: ({ row }) => t(row.original.method) },
    { accessorKey: 'bank', header: t('الحساب البنكي'), cell: ({ row }) => <span dir="ltr">{row.original.bank}</span> },
    { id: 'date', header: t('تاريخ الطلب'), cell: ({ row }) => arDate(row.original.date) },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => { const w = row.original; return (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض التفاصيل'), onClick: () => navigate(`/records/withdrawal/${w.id}`) },
        { icon: CheckCircle, label: t('اعتماد الطلب'), onClick: () => setApproving(w.id), hidden: w.status !== 'معلق' },
        { icon: XCircle, label: t('رفض الطلب'), variant: 'destructive', onClick: () => { setRejecting(w.id); setReason(''); setRErr('') }, hidden: w.status !== 'معلق' },
        { icon: Send, label: t('تنفيذ الدفع'), onClick: () => { setProcessing(w); setPNotes(''); setPErr('') }, hidden: w.status !== 'معتمد' },
        { icon: CheckCheck, label: t('تأكيد الاكتمال'), onClick: () => { setCompleting(w); setConfirmNo(''); setCNotes(''); setCErr('') }, hidden: w.status !== 'قيد التنفيذ' },
      ]} />) } },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث برقم الطلب أو التاجر...')} className="pe-9" aria-label={t('بحث في طلبات السحب')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['معلق', 'معتمد', 'قيد التنفيذ', 'مكتمل', 'مرفوض'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <span className="ms-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">{(data?.rows ?? []).filter(w => w.status === 'معلق').length} {t('طلب بانتظار المراجعة')}</span>
          </div>
        } />

      <ConfirmDialog open={!!approving} onOpenChange={v => { if (!v) setApproving(null) }} title={t('اعتماد طلب السحب')} loading={approve.isPending}
        description={t('هل أنت متأكد من اعتماد طلب السحب') + ' ' + (approving ?? '') + '؟ ' + t('سيتم إرسال إشعار الاعتماد للتاجر وتحويل الطلب لقائمة تنفيذ الدفع.')}
        confirmLabel={t('اعتماد')} onConfirm={() => approve.mutate(approving!)} />

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={t('رفض طلب السحب') + ' — ' + (rejecting ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRejecting(null)}>{t('إلغاء')}</Button>
          <Button variant="destructive" disabled={reject.isPending} onClick={() => {
            const v = reason.trim()
            if (!v) { setRErr(t('سبب الرفض مطلوب')); return }
            if (v.length < 10 || v.length > 500) { setRErr(t('يجب أن يكون سبب الرفض بين 10 و 500 حرف')); return }
            setRErr('')
            reject.mutate({ id: rejecting!, reason: v })
          }}>{t('تأكيد الرفض')}</Button>
        </>}>
        <Label>{t('سبب الرفض')} <span className="text-destructive">*</span> (10 – 500 {t('حرف')})</Label>
        <Textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
        {rErr && <p className="mt-1 text-xs font-bold text-destructive">{rErr}</p>}
      </Modal>

      <Modal open={!!processing} onClose={() => setProcessing(null)} title={t('تنفيذ الدفع') + ' — ' + (processing?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setProcessing(null)}>{t('إلغاء')}</Button>
          <Button disabled={process.isPending} onClick={() => {
            if (pNotes.length > 300) { setPErr(t('ملاحظات الدفع يجب أن تكون أقل من 300 حرف')); return }
            setPErr('')
            process.mutate({ id: processing!.id, notes: pNotes })
          }}>{t('تأكيد الدفع')}</Button>
        </>}>
        {processing && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[[t('التاجر'), processing.m], [t('المبلغ'), money(processing.amount)], [t('الطريقة'), t(processing.method)], [t('مرجع العملية'), 'PMT-' + String(1).padStart(3, '0')]].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs font-bold text-muted-foreground">
            {t('تفاصيل الحساب البنكي')}:<br />
            {t('البنك')}: {t('مصرف الراجحي')} — {t('صاحب الحساب')}: {processing.m} — {t('الآيبان')}: <span dir="ltr">SA4420000001234567891234</span>
          </div>
          <div className="mt-3"><Label>{t('ملاحظات الدفع (اختياري — 300 حرف)')}</Label><Textarea value={pNotes} maxLength={300} onChange={e => setPNotes(e.target.value)} /></div>
          {pErr && <p className="mt-1 text-xs font-bold text-destructive">{pErr}</p>}
        </>}
      </Modal>

      <Modal open={!!completing} onClose={() => setCompleting(null)} title={t('تأكيد الاكتمال') + ' — ' + (completing?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setCompleting(null)}>{t('إلغاء')}</Button>
          <Button disabled={complete.isPending} onClick={() => {
            if (confirmNo.length > 100) { setCErr(t('رقم التأكيد يجب أن يكون أقل من 100 حرف')); return }
            if (cNotes.length > 300) { setCErr(t('ملاحظات الاكتمال يجب أن تكون أقل من 300 حرف')); return }
            setCErr('')
            complete.mutate({ id: completing!.id, confirmNo })
          }}>{t('تأكيد الاكتمال')}</Button>
        </>}>
        {completing && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[[t('التاجر'), completing.m], [t('المبلغ'), money(completing.amount)]].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="grid gap-3">
            <div><Label>{t('رقم تأكيد التحويل البنكي (اختياري — 100 حرف)')}</Label><Input value={confirmNo} maxLength={100} onChange={e => setConfirmNo(e.target.value)} /></div>
            <div><Label>{t('ملاحظات (اختياري — 300 حرف)')}</Label><Textarea value={cNotes} maxLength={300} onChange={e => setCNotes(e.target.value)} /></div>
          </div>
          {cErr && <p className="mt-1 text-xs font-bold text-destructive">{cErr}</p>}
        </>}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={t('تفاصيل طلب السحب') + ' — ' + (viewing?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setViewing(null)}>{t('إغلاق')}</Button>
        </>}>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                [t('رقم الطلب'), viewing.id],
                [t('التاجر'), viewing.m],
                [t('المبلغ'), money(viewing.amount)],
                [t('الطريقة'), t(viewing.method)],
                [t('الحساب البنكي'), <span dir="ltr">{viewing.bank}</span>],
                [t('التاريخ'), arDate(viewing.date)],
                [t('الحالة'), t(viewing.status)],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border bg-muted/40 px-3 py-2">
                  <p className="text-[11px] font-bold text-muted-foreground">{k}</p>
                  <p className="text-[13px] font-extrabold">{v}</p>
                </div>
              ))}
            </div>
            {viewing.notes && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground">{t('الملاحظات')}</p>
                <div className="mt-1 rounded-lg border bg-muted/40 p-3 text-sm font-semibold">
                  {viewing.notes}
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

/* ---------- محافظ التجار ---------- */
export function WalletsPage() {
  const qc = useQueryClient()
  const t = useT()
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
    onSuccess: bal => { toast.success(t('تم تعديل المحفظة بنجاح، الرصيد الجديد: ') + money(bal)); invalidate(); setAdjusting(null); setConfirmStep(false) },
    onError: e => toast.error((e as Error).message),
  })

  const validate = () => {
    if (!form.amount || isNaN(form.amount)) { setFErr(t('مبلغ التعديل مطلوب')); return }
    if (form.amount < 0.01) { setFErr(t('يجب أن يكون مبلغ التعديل 0.01 على الأقل')); return }
    if (form.amount > 100000) { setFErr(t('يجب أن يكون مبلغ التعديل أقل من 100,000')); return }
    if (form.type.startsWith('خصم') && adjusting && form.amount > adjusting.bal) { setFErr(t('يجب أن يكون مبلغ التعديل أقل من أو يساوي الرصيد الحالي')); return }
    if (!form.reason) { setFErr(t('سبب التعديل مطلوب')); return }
    if (form.notes.length > 500) { setFErr(t('ملاحظات التعديل يجب أن تكون أقل من 500 حرف')); return }
    setFErr('')
    setConfirmStep(true)
  }

  const columns: ColumnDef<Wallet, unknown>[] = [
    { id: 'merchant', header: t('التاجر'), cell: ({ row }) => <div><p className="font-bold">{row.original.m}</p><p className="text-[11px] text-muted-foreground">{row.original.email}</p></div> },
    { id: 'bal', header: t('الرصيد الحالي'), cell: ({ row }) => <span className={row.original.bal < 0 ? 'font-black text-destructive' : 'font-bold'}>{money(row.original.bal)}</span> },
    { id: 'res', header: t('المحجوز'), cell: ({ row }) => money(row.original.res) },
    { id: 'avail', header: t('المتاح'), cell: ({ row }) => money(row.original.bal - row.original.res) },
    { id: 'credits', header: t('إجمالي الإيداعات'), cell: ({ row }) => money(row.original.credits) },
    { id: 'debits', header: t('إجمالي السحوبات'), cell: ({ row }) => money(row.original.debits) },
    { id: 'last', header: t('آخر عملية'), cell: ({ row }) => arDate(row.original.last) },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Edit3, label: t('تعديل يدوي للرصيد'), onClick: () => { setAdjusting(row.original); setForm({ type: 'إيداع (إضافة للرصيد)', amount: 0, reason: '', notes: '' }); setFErr(''); setConfirmStep(false) } },
      ]} />) },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.m}
        getRowClassName={r => (r.bal < 0 ? 'bg-red-50/60' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بالتاجر أو البريد...')} className="pe-9" aria-label={t('بحث في المحافظ')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['نشط', 'موقوف', 'مجمّد'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <p className="ms-auto text-xs font-semibold text-muted-foreground">{t('المحافظ ذات الرصيد السالب تظهر باللون الأحمر')}</p>
          </div>
        } />

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={t('تعديل يدوي للمحفظة') + ' — ' + (adjusting?.m ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setAdjusting(null)}>{t('إلغاء')}</Button>
          {!confirmStep
            ? <Button onClick={validate}>{t('متابعة')}</Button>
            : <Button disabled={adjust.isPending} onClick={() => adjust.mutate()}>{t('تأكيد التعديل')}</Button>}
        </>}>
        {adjusting && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{t('التاجر')}</p><p className="text-[13px] font-extrabold">{adjusting.m}</p></div>
            <div className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{t('الرصيد الحالي')}</p><p className="text-[13px] font-extrabold">{money(adjusting.bal)}</p></div>
          </div>
          {!confirmStep ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>{t('نوع التعديل')} <span className="text-destructive">*</span></Label>
                <select className={selectCls + ' w-full'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="إيداع (إضافة للرصيد)">{t('إيداع (إضافة للرصيد)')}</option>
                  <option value="خصم (اقتطاع من الرصيد)">{t('خصم (اقتطاع من الرصيد)')}</option>
                </select></div>
              <div><Label>{t('مبلغ التعديل')} (0.01 – 100,000) <span className="text-destructive">*</span></Label><Input type="number" step="0.01" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} /></div>
              <div><Label>{t('سبب التعديل')} <span className="text-destructive">*</span></Label>
                <select className={selectCls + ' w-full'} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                  <option value="">{t('اختر السبب...')}</option>
                  {['تصحيح', 'مكافأة', 'غرامة', 'تعويض', 'أخرى'].map(r => <option key={r} value={r}>{t(r)}</option>)}
                </select></div>
              <div><Label>{t('ملاحظات (اختياري — 500 حرف)')}</Label><Input value={form.notes} maxLength={500} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
          ) : (
            <p className="rounded-lg border bg-muted/50 p-4 text-sm font-bold">
              {t('هل أنت متأكد من')} {form.type.startsWith('خصم') ? t('خصم') : t('إيداع')} <b>{money(form.amount)}</b> {form.type.startsWith('خصم') ? t('من') : t('إلى')} {t('محفظة')} <b>{adjusting.m}</b>؟
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
  const navigate = useNavigate()
  const qc = useQueryClient()
  const t = useT()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, page, pageSize: 10 }), [dq, status, page])
  const { data, isLoading } = useQuery({ queryKey: ['invoices', qp], queryFn: () => financeService.invoices(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['invoices'] })

  const [viewing, setViewing] = useState<Invoice | null>(null)
  const [resending, setResending] = useState<string | null>(null)
  const resend = useMutation({ mutationFn: (ref: string) => financeService.resendInvoice(ref), onSuccess: () => { toast.success(t('تم إرسال الفاتورة بنجاح')); invalidate(); setResending(null) } })
  const markPaid = useMutation({ mutationFn: (ref: string) => financeService.markPaid(ref), onSuccess: () => { toast.success(t('تم تحديد الفاتورة كمدفوعة بنجاح')); invalidate() } })

  const columns: ColumnDef<Invoice, unknown>[] = [
    { accessorKey: 'ref', header: t('مرجع الفاتورة'), cell: ({ row }) => <button dir="ltr" className="font-bold underline-offset-4 hover:underline" onClick={() => navigate(`/records/invoice/${row.original.ref}`)}>{row.original.ref}</button> },
    { id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },
    { id: 'period', header: t('الفترة'), cell: ({ row }) => t(row.original.period) },
    { id: 'total', header: t('المبلغ المستحق'), cell: ({ row }) => <b>{money(row.original.total)}</b> },
    { id: 'due', header: t('الاستحقاق'), cell: ({ row }) => arDate(row.original.due) },
    { id: 'gen', header: t('تاريخ الإنشاء'), cell: ({ row }) => arDate(row.original.gen) },
    { id: 'sent', header: t('تاريخ الإرسال'), cell: ({ row }) => arDate(row.original.sent) },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض التفاصيل'), onClick: () => setViewing(row.original) },
        { icon: Download, label: t('تنزيل / طباعة PDF'), onClick: () => {
          if (generateInvoicePdf(row.original)) toast.success(t('تم فتح الفاتورة للطباعة أو الحفظ بصيغة PDF'))
          else toast.error(t('تعذر فتح الفاتورة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة.'))
        } },
        { icon: Mail, label: t('إعادة إرسال الفاتورة'), onClick: () => setResending(row.original.ref) },
        { icon: CheckCircle, label: t('تحديد كمدفوعة'), onClick: () => markPaid.mutate(row.original.ref), hidden: row.original.status === 'مدفوعة' },
      ]} />) },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        getRowClassName={r => (r.status === 'متأخرة' ? 'bg-red-50/60' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بمرجع الفاتورة أو التاجر...')} className="pe-9" aria-label={t('بحث في الفواتير')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['تم الإنشاء', 'مرسلة', 'مستعرضة', 'مدفوعة', 'متأخرة'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('invoices', ['المرجع', 'التاجر', 'الفترة', 'الإجمالي', 'الاستحقاق', 'الحالة'], (data?.rows ?? []).map(i => [i.ref, i.m, i.period, i.total, i.due, i.status])); toast.success(t('تم تصدير الملف بنجاح')) }}>{t('تصدير')}</Button>
          </div>
        } />

      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={t('تفاصيل الفاتورة') + ' — ' + (viewing?.ref ?? '')}
        footer={<Button variant="outline" onClick={() => {
          if (!viewing) return
          if (generateInvoicePdf(viewing)) toast.success(t('تم فتح الفاتورة للطباعة أو الحفظ بصيغة PDF'))
          else toast.error(t('تعذر فتح الفاتورة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة.'))
        }}>{t('طباعة / تنزيل PDF')}</Button>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[[t('التاجر'), viewing.m], [t('الفترة'), viewing.period], [t('الحالة'), <StatusBadge key="s" value={viewing.status} />], [t('الاستحقاق'), arDate(viewing.due)]].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('البند')}</th><th className="p-2 text-start font-extrabold">{t('الكمية')}</th><th className="p-2 text-start font-extrabold">{t('المبلغ')}</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2">{t('رسوم تنفيذ الطلبات')}</td><td className="p-2">24 {t('طلب')}</td><td className="p-2">{money(viewing.total * 0.5)}</td></tr>
                <tr className="border-b"><td className="p-2">{t('رسوم الخدمات المساندة')}</td><td className="p-2">3</td><td className="p-2">{money(viewing.total * 0.3)}</td></tr>
                <tr className="border-b"><td className="p-2">{t('تكاليف شحن المنصة')}</td><td className="p-2">12</td><td className="p-2">{money(viewing.total * 0.14)}</td></tr>
                <tr className="border-b"><td className="p-2">{t('الإجمالي الفرعي')}</td><td className="p-2" /><td className="p-2">{money(viewing.total / 1.15)}</td></tr>
                <tr className="border-b"><td className="p-2">{t('ضريبة القيمة المضافة')} (15%)</td><td className="p-2" /><td className="p-2">{money(viewing.total - viewing.total / 1.15)}</td></tr>
                <tr><td className="p-2 font-black">{t('إجمالي المبلغ المستحق')}</td><td className="p-2" /><td className="p-2 font-black">{money(viewing.total)}</td></tr>
              </tbody>
            </table>
          </div>
        </>}
      </Modal>

      <ConfirmDialog open={!!resending} onOpenChange={v => { if (!v) setResending(null) }} title={t('إعادة إرسال الفاتورة')} loading={resend.isPending}
        description={t('هل أنت متأكد من إعادة إرسال الفاتورة') + ' ' + (resending ?? '') + ' ' + t('إلى بريد التاجر؟')}
        confirmLabel={t('إعادة الإرسال')} onConfirm={() => resend.mutate(resending!)} />
    </div>
  )
}
