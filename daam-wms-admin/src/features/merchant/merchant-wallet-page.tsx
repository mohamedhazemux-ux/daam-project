import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/tables/data-table'
import { ActionButtons, AttachmentBadgeList, ConfirmDialog, FileUploadWithPreview, Modal, StatusBadge, selectCls } from '@/components/common'
import { merchantFinanceService, type Tx } from '@/services/merchant-finance.service'
import { useAuthStore } from '@/store/auth-store'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { downloadCSV, money, arDate } from '@/lib/utils'
import { printInvoicePDF } from '@/lib/pdf-utils'
import { useT } from '@/lib/i18n'
import { Download, Eye, FileDown, Search, Wallet, XCircle } from 'lucide-react'
const KV = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
export default function MerchantWalletPage() {
  const scrollToTx = () => {
    const el = document.getElementById('merchant-tx-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const searchInput = el.querySelector('input')
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 400)
      }
    }
  }
  return (
    <div className="space-y-6">
      <Overview onShowTx={scrollToTx} />
      <div id="merchant-tx-section" className="pt-2">
        <h3 className="mb-3 text-sm font-black">سجل المعاملات المالية</h3>
        <TxTab />
      </div>
    </div>
  )
}

function Overview({ onShowTx }: { onShowTx: () => void }) {
  const t = useT()
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: w } = useQuery({ queryKey: ['m-wallet', user?.store], queryFn: () => merchantFinanceService.wallet(user!.store!), refetchInterval: 60_000 })
  const { data: accounts } = useQuery({ queryKey: ['m-bank', user?.store], queryFn: () => merchantFinanceService.bankAccounts(user!.store!) })
  const [wdOpen, setWdOpen] = useState(false)
  const [form, setForm] = useState({ amount: 0, account: '', notes: '', attachments: [] as string[] })
  const [fErr, setFErr] = useState('')
  const onFiles = (list: FileList | null) => {
    if (!list) return
    const arr = Array.from(list)
    if (form.attachments.length + arr.length > 5) { setFErr(t('الحد الأقصى 5 مرفقات')); return }
    for (const f of arr) {
      if (!/\.(jpg|png|jpeg|pdf)$/i.test(f.name)) { setFErr(t('امتداد غير صالح، يرجى رفع ملف بصيغة JPG أو PNG أو JPEG أو PDF')); return }
      if (f.size > 10 * 1024 * 1024) { setFErr(t('الحجم الأقصى للملف 10 ميجابايت، يرجى استخدام ملف آخر')); return }
    }
    setFErr('')
    setForm(f => ({ ...f, attachments: [...f.attachments, ...arr.map(x => x.name)] }))
  }
  const submit = useMutation({
    mutationFn: () => merchantFinanceService.submitWithdrawal(user!.store!, user!.email, form),
    onSuccess: () => {
      toast.success(t('تم إرسال طلب السحب بنجاح'))
      qc.invalidateQueries({ queryKey: ['m-wallet'] })
      qc.invalidateQueries({ queryKey: ['m-wd'] })
      setWdOpen(false)
      navigate('/merchant/finance/withdrawals')
    }
  })
  const doSubmit = () => {
    if (!form.amount) { setFErr(t('مبلغ السحب مطلوب')); return }
    if (form.amount < 100) { setFErr(t('الحد الأدنى لمبلغ السحب هو 100')); return }
    if (w && form.amount > w.avail) { setFErr(t('يجب أن يكون مبلغ السحب أقل من أو يساوي الرصيد المتاح')); return }
    if (!form.account) { setFErr(t('الحساب البنكي مطلوب')); return }
    if (form.notes.length > 300) { setFErr(t('يجب أن تكون ملاحظات السحب أقل من 300 حرف')); return }
    setFErr('')
    submit.mutate()
  }
  if (!w) return null
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground"><Wallet className="size-7 text-background" /></div>
          <div><p className="text-[11px] font-bold text-muted-foreground">{t('الرصيد الحالي للمحفظة')}</p><p className="text-3xl font-black">{money(w.bal)}</p></div>
          <div className="ms-auto flex gap-2">
            <Button variant="outline" onClick={onShowTx}>{t('عرض سجل المعاملات')}</Button>
            <Button onClick={() => { setForm({ amount: 0, account: '', notes: '', attachments: [] }); setFErr(''); setWdOpen(true) }}>{t('طلب سحب')}</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KV k={t('إجمالي الإيداعات (تراكمي)')} v={money(w.credits)} /><KV k={t('إجمالي السحوبات (تراكمي)')} v={money(w.debits)} /><KV k={t('إيداعات معلقة')} v={money(w.pending)} /><KV k={t('المبلغ المحجوز')} v={money(w.res)} /><KV k={t('الرصيد المتاح')} v={money(w.avail)} />
      </div>
      <Modal open={wdOpen} onClose={() => setWdOpen(false)} title={t('طلب سحب من المحفظة')}
        footer={<><Button variant="outline" onClick={() => setWdOpen(false)}>{t('إلغاء')}</Button><Button disabled={submit.isPending} onClick={doSubmit}>{t('إرسال طلب السحب')}</Button></>}>
        <div className="grid gap-3">
          <div>
            <Label>{t('مبلغ السحب')} <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min={100}
              max={w.avail}
              placeholder={t('أدخل المبلغ (مثال: 500)')}
              value={form.amount || ''}
              onChange={e => {
                const val = e.target.value === '' ? 0 : Number(e.target.value)
                setForm(f => ({ ...f, amount: val }))
                if (val > 0 && val < 100) {
                  setFErr(t('تنبيه: الحد الأدنى للسحب هو 100 ر.س — يرجى كتابة مبلغ 100 فما فوق'))
                } else if (w && val > w.avail) {
                  setFErr(t('تنبيه: المبلغ يتجاوز الرصيد المتاح') + ` (${money(w.avail)})`)
                } else {
                  setFErr('')
                }
              }}
            />
            <p className="mt-1 text-[11px] font-bold text-muted-foreground">
              {t('الحد الأدنى للسحب:')} <b className="text-foreground">100 {t('ر.س')}</b> — {t('الرصيد المتاح:')} <b className="text-foreground">{money(w.avail)}</b>
            </p>
          </div>
          <div><Label>{t('طريقة السحب')} <span className="text-destructive">*</span></Label><Input readOnly value={t('تحويل بنكي')} /></div>
          <div><Label>{t('الحساب البنكي')} <span className="text-destructive">*</span></Label>
            {(accounts ?? []).length === 0 ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{t('لا يوجد حساب بنكي موثق، يرجى إضافة حساب بنكي أولاً')}</p> : (
              <select className={selectCls + ' w-full'} value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))}>
                <option value="">{t('اختر الحساب...')}</option>
                {(accounts ?? []).map(a => <option key={a.id} value={a.label}>{a.label}</option>)}
              </select>)}</div>
          <div><Label>{t('ملاحظات السحب (اختياري — 300 حرف)')}</Label><Textarea maxLength={300} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div>
            <Label className="mb-1 block">{t('المرفقات والوثائق الداعمة (اختياري — حتى 5 ملفات)')}</Label>
            <FileUploadWithPreview
              files={form.attachments}
              accept=".jpg,.png,.jpeg,.pdf,.webp"
              maxFiles={5}
              maxSizeMB={10}
              onChange={atts => setForm(f => ({ ...f, attachments: atts }))}
            />
          </div>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
    </div>
  )
}
function TxTab() {
  const t = useT()
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [q, setQ] = useState(''); const [type, setType] = useState(''); const [status, setStatus] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [minA, setMinA] = useState(''); const [maxA, setMaxA] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, status, from, to, minA, maxA, page, pageSize: 10, store: user?.store ?? '' }), [dq, type, status, from, to, minA, maxA, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-tx', qp], queryFn: () => merchantFinanceService.transactions(qp) })
  const [viewing, setViewing] = useState<Tx | null>(null)
  const columns = [
    { accessorKey: 'id', header: t('معرّف المعاملة'), cell: ({ row }: any) => <b dir="ltr">{row.original.id}</b> },
    { id: 'type', header: t('النوع'), cell: ({ row }: any) => <StatusBadge value={row.original.type} /> },
    { accessorKey: 'desc', header: t('الوصف'), cell: ({ row }: any) => <span className="block max-w-[220px] truncate">{row.original.desc}</span> },
    { id: 'amount', header: t('المبلغ'), cell: ({ row }: any) => <span className={(row.original.type === 'إيداع' || row.original.type === 'استرداد') ? 'font-black text-emerald-600' : 'font-black text-destructive'}>{(row.original.type === 'إيداع' || row.original.type === 'استرداد') ? '+' : '-'}{money(row.original.amount)}</span> },
    { id: 'running', header: t('الرصيد بعد المعاملة'), cell: ({ row }: any) => money(row.original.running) },
    { id: 'status', header: t('الحالة'), cell: ({ row }: any) => <StatusBadge value={row.original.status} /> },
    { accessorKey: 'date', header: t('التاريخ'), cell: ({ row }: any) => arDate(row.original.date) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }: any) => <Button size="sm" variant="outline" onClick={() => setViewing(row.original)}>{t('عرض التفاصيل')}</Button> },
  ] as ColumnDef<any, unknown>[]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={(r: any) => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بالمعرّف أو الوصف أو المرجع...')} className="pe-9" aria-label={t('بحث في المعاملات')} />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label={t('تصفية حسب النوع')}>
              <option value="">{t('كل الأنواع')}</option>
              {['إيداع', 'خصم', 'استرداد', 'سحب', 'تعديل'].map(tp => <option key={tp} value={tp}>{t(tp)}</option>)}
            </select>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['مكتمل', 'معلق', 'فشل'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <Input type="date" className="w-36" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} aria-label={t('من تاريخ')} />
            <Input type="date" className="w-36" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} aria-label={t('إلى تاريخ')} />
            <Input type="number" className="w-24" placeholder={t('من مبلغ')} value={minA} onChange={e => { setMinA(e.target.value); setPage(1) }} aria-label={t('من مبلغ')} />
            <Input type="number" className="w-24" placeholder={t('إلى مبلغ')} value={maxA} onChange={e => { setMaxA(e.target.value); setPage(1) }} aria-label={t('إلى مبلغ')} />
            <Button variant="outline" size="sm" onClick={() => { setType(''); setStatus(''); setFrom(''); setTo(''); setMinA(''); setMaxA(''); setPage(1) }}>{t('إعادة التعيين')}</Button>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('transactions', ['المعرّف', 'النوع', 'الوصف', 'المبلغ', 'الرصيد بعد', 'الحالة', 'التاريخ'], (data?.rows ?? []).map(x => [x.id, x.type, x.desc, x.amount, x.running, x.status, x.date])); toast.success(t('تم تصدير سجل المعاملات بنجاح')) }}>{t('تصدير')}</Button>
          </div>
        } />
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={'تفاصيل المعاملة — ' + (viewing?.id ?? '')} footer={<Button variant="outline" onClick={() => setViewing(null)}>إغلاق</Button>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <KV k="النوع" v={viewing.type} /><KV k="المبلغ" v={money(viewing.amount)} /><KV k="الرصيد بعد المعاملة" v={money(viewing.running)} /><KV k="الحالة" v={viewing.status} /><KV k="التاريخ" v={viewing.date} /><KV k="نُفذ بواسطة" v={viewing.by ?? 'النظام'} />
          </div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">الوصف</p>
          <p className="mb-3 rounded-lg border bg-muted/40 p-3 text-[13px] font-bold">{viewing.desc}</p>
          <div className="flex gap-2">
            {viewing.orderRef && <Button variant="outline" size="sm" onClick={() => navigate('/merchant/orders')}>الانتقال إلى الطلب {viewing.orderRef}</Button>}
            {viewing.returnRef && <Button variant="outline" size="sm" onClick={() => navigate('/merchant/returns')}>الانتقال إلى المرتجع {viewing.returnRef}</Button>}
          </div>
        </>}
      </Modal>
    </div>
  )
}
const wdTimeline = (w: any): string[] => {
  const t = ['معلق — ' + w.date]
  if (w.status !== 'معلق') t.push('معتمد بواسطة منى المطيري — ' + w.date)
  if (w.status === 'قيد التنفيذ' || w.status === 'مكتمل') t.push('قيد التنفيذ — تحويل بنكي — ' + w.date)
  if (w.status === 'مكتمل') t.push('مكتمل — مرجع العملية TRX-' + String(w.id).slice(-3) + ' — ' + w.date)
  if (w.status === 'مرفوض') t.push('مرفوض بواسطة منى المطيري — السبب: بيانات الحساب تحتاج تحديث — ' + w.date)
  if (w.status === 'ملغي') t.push('ملغي بواسطة التاجر — تم تحرير المبلغ المحجوز — ' + w.date)
  if (w.status === 'فشل') t.push('فشل — تعذر تنفيذ التحويل البنكي — ' + w.date)
  return t
}
function WdTab() {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, page, pageSize: 10, store: user?.store ?? '' }), [dq, status, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-wd', qp], queryFn: () => merchantFinanceService.withdrawals(qp) })
  const { data: accounts } = useQuery({ queryKey: ['m-bank', user?.store], queryFn: () => merchantFinanceService.bankAccounts(user!.store!) })
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [viewing, setViewing] = useState<any>(null)
  const cancel = useMutation({ mutationFn: (id: string) => merchantFinanceService.cancelWithdrawal(id), onSuccess: () => { toast.success(t('تم إلغاء طلب السحب بنجاح')); qc.invalidateQueries({ queryKey: ['m-wd'] }); qc.invalidateQueries({ queryKey: ['m-wallet'] }); setCancelling(null); setViewing(null) }, onError: e => toast.error((e as Error).message) })
  const acc = (accounts ?? [])[0]
  const columns = [
    { accessorKey: 'id', header: t('رقم الطلب'), cell: ({ row }: any) => <b>{row.original.id}</b> },
    { id: 'amount', header: t('المبلغ'), cell: ({ row }: any) => money(row.original.amount) },
    { accessorKey: 'method', header: t('الطريقة'), cell: ({ row }: any) => t(row.original.method) },
    { accessorKey: 'bank', header: t('الحساب البنكي'), cell: ({ row }: any) => <span dir="ltr">****{String(row.original.bank).slice(-4)}</span> },
    { id: 'status', header: t('الحالة'), cell: ({ row }: any) => <StatusBadge value={row.original.status} /> },
    { accessorKey: 'date', header: t('تاريخ الطلب'), cell: ({ row }: any) => arDate(row.original.date) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }: any) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض تفاصيل السحب'), onClick: () => navigate('/merchant/records/withdrawal/' + row.original.id) },
        { icon: XCircle, label: t('إلغاء طلب السحب'), variant: 'destructive', onClick: () => setCancelling(row.original.id), hidden: row.original.status !== 'معلق' },
      ]} />) },
  ] as ColumnDef<any, unknown>[]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={(r: any) => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث برقم الطلب...')} className="pe-9" aria-label={t('بحث في طلبات السحب')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['معلق', 'معتمد', 'مرفوض', 'قيد التنفيذ', 'مكتمل', 'فشل', 'ملغي'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('withdrawals', ['الرقم', 'المبلغ', 'الطريقة', 'الحساب', 'الحالة', 'التاريخ'], (data?.rows ?? []).map((x: any) => [x.id, x.amount, x.method, x.bank, x.status, x.date])); toast.success(t('تم تصدير طلبات السحب بنجاح')) }}>{t('تصدير')}</Button>
          </div>
        } />
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={t('تفاصيل طلب السحب — ') + (viewing?.id ?? '')}
        footer={viewing?.status === 'معلق' ? <Button variant="destructive" onClick={() => setCancelling(viewing.id)}>{t('إلغاء الطلب')}</Button> : <Button variant="outline" onClick={() => setViewing(null)}>{t('إغلاق')}</Button>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <KV k="رقم الطلب" v={viewing.id} /><KV k="المبلغ" v={money(viewing.amount)} /><KV k="الطريقة" v={viewing.method} /><KV k="الحالة" v={viewing.status} /><KV k="تاريخ الطلب" v={viewing.date} />
          </div>
          {viewing.notes && <div className="mb-3"><p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('ملاحظات السحب')}</p><p className="rounded-lg border bg-muted/40 p-3 text-[13px] font-bold">{viewing.notes}</p></div>}
          {viewing.attachment && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('المرفقات')}</p>
              <AttachmentBadgeList attachments={[viewing.attachment]} />
            </div>
          )}
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('الحساب البنكي')}</p>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <KV k="اسم البنك" v={acc?.bank ?? '—'} /><KV k="اسم صاحب الحساب" v={acc?.holder ?? '—'} /><KV k="رقم الحساب (مقنع)" v={acc?.masked ?? '—'} /><KV k="الآيبان" v={<span dir="ltr">{acc?.iban ?? '—'}</span>} />
          </div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('الخط الزمني للحالات')}</p>
          <div className="space-y-1">{wdTimeline(viewing).map((tVal, i) => <p key={i} className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {tVal}</p>)}</div>
        </>}
      </Modal>
      <ConfirmDialog open={!!cancelling} onOpenChange={v => { if (!v) setCancelling(null) }} destructive title={t('إلغاء طلب السحب')} loading={cancel.isPending}
        description={t('هل أنت متأكد من رغبتك في إلغاء طلب السحب: ') + (cancelling ?? '') + '؟'}
        confirmLabel={t('إلغاء الطلب')} onConfirm={() => cancel.mutate(cancelling!)} />
    </div>
  )
}

export function MerchantWithdrawalsPage() {
  return <WdTab />
}

export function MerchantSubscriptionsPage() {
  return <SubsTab />
}

export function MerchantInvoicesPage() {
  return <InvTab />
}

function SubsTab() {


  const t = useT()
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, page, pageSize: 10, store: user?.store ?? '' }), [dq, status, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-subs', qp], queryFn: () => merchantFinanceService.subscriptions(qp) })
  const [cancelling, setCancelling] = useState<{ id: string; type: string } | null>(null)
  const [viewing, setViewing] = useState<any>(null)
  const cancel = useMutation({ mutationFn: (id: string) => merchantFinanceService.cancelSubscription(id), onSuccess: () => { toast.success(t('تم إلغاء الاشتراك بنجاح')); qc.invalidateQueries({ queryKey: ['m-subs'] }); setCancelling(null); setViewing(null) } })
  const columns = [
    { accessorKey: 'id', header: t('معرف الاشتراك'), cell: ({ row }: any) => <b>{row.original.id}</b> },
    { accessorKey: 'type', header: t('نوع الخدمة') },
    { id: 'cost', header: t('التكلفة لكل دورة'), cell: ({ row }: any) => money(row.original.cost) },
    { accessorKey: 'freq', header: t('تكرار الدورة') },
    { accessorKey: 'next', header: t('تاريخ الفوترة التالي') },
    { id: 'status', header: t('حالة الاشتراك'), cell: ({ row }: any) => <StatusBadge value={row.original.status} /> },
    { accessorKey: 'start', header: t('بدأ في') },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }: any) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض تفاصيل الاشتراك'), onClick: () => setViewing(row.original) },
        { icon: XCircle, label: t('إلغاء الاشتراك'), variant: 'destructive', onClick: () => setCancelling({ id: row.original.id, type: row.original.type }), hidden: row.original.status !== 'نشط' },
      ]} />) },
  ] as ColumnDef<any, unknown>[]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={(r: any) => r.id}
        getRowClassName={(r: any) => (r.status === 'فشل الدفع' ? 'bg-red-50/60' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بالمعرف أو الخدمة...')} className="pe-9" aria-label={t('بحث في الاشتراكات')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['نشط', 'ملغي', 'فشل الدفع'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
          </div>
        } />
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={t('تفاصيل الاشتراك — ') + (viewing?.id ?? '')}
        footer={viewing?.status === 'نشط' ? <Button variant="destructive" onClick={() => setCancelling({ id: viewing.id, type: viewing.type })}>{t('إلغاء الاشتراك')}</Button> : <Button variant="outline" onClick={() => setViewing(null)}>{t('إغلاق')}</Button>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <KV k={t("معرف الاشتراك")} v={viewing.id} /><KV k={t("مرجع طلب الخدمة")} v={'SRV-' + viewing.id.slice(-3)} /><KV k={t("نوع الخدمة")} v={viewing.type} /><KV k={t("التكلفة لكل دورة")} v={money(viewing.cost)} /><KV k={t("تكرار الدورة")} v={viewing.freq} /><KV k={t("تاريخ الفوترة التالي")} v={viewing.next} /><KV k={t("الحالة")} v={viewing.status} /><KV k={t("إجمالي المفوتر حتى الآن")} v={money(viewing.total)} />
          </div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('سجل الفوترة')}</p>
          <div className="space-y-1">
            <p className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {viewing.start} — {t('رسوم الدورة الأولى')} — {money(viewing.cost)} — {t('مكتمل')}</p>
            {viewing.status === 'نشط' && <p className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {viewing.next} — {t('الرسوم القادمة')} — {money(viewing.cost)} — {t('مجدولة')}</p>}
            {viewing.status === 'فشل الدفع' && <p className="rounded-md border p-2 text-[11px] font-bold text-destructive">• {t('محاولة خصم فاشلة — رصيد غير كافٍ')}</p>}
          </div>
        </>}
      </Modal>
      <ConfirmDialog open={!!cancelling} onOpenChange={v => { if (!v) setCancelling(null) }} destructive title={t('إلغاء الاشتراك')} loading={cancel.isPending}
        description={t('هل أنت متأكد من رغبتك في إلغاء الاشتراك لـ ') + (cancelling?.type ?? '') + '؟'}
        confirmLabel={t('إلغاء الاشتراك')} onConfirm={() => cancel.mutate(cancelling!.id)} />
    </div>
  )
}
function InvTab() {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [period, setPeriod] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, period, page, pageSize: 10, store: user?.store ?? '' }), [dq, status, period, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-inv', qp], queryFn: () => merchantFinanceService.invoices(qp) })
  const [viewing, setViewing] = useState<any>(null)
  const open = async (ref: string) => { const d = await merchantFinanceService.invoiceDetails(ref); setViewing(d) }
  const generateInvoicePdf = (invoice: any) => {
    if (!invoice) return
    const opened = printInvoicePDF({
      reference: invoice.ref,
      period: invoice.period,
      merchantName: invoice.m || user?.store || 'التاجر',
      merchantEmail: invoice.email || user?.email || 'merchant@example.com',
      items: (invoice.items ?? []).map((it: any) => ({
        description: it.d || it.description || 'بند الفاتورة',
        quantity: Number(it.q ?? it.quantity ?? 1),
        unitPrice: Number(it.u ?? it.unitPrice ?? 0),
        total: Number((it.q ?? it.quantity ?? 1) * (it.u ?? it.unitPrice ?? 0)),
      })),
      subtotal: Number((invoice.subtotal ?? invoice.total / 1.15) || 0),
      tax: Number((invoice.tax ?? (invoice.total - (invoice.total / 1.15))) || 0),
      total: Number(invoice.total ?? 0),
      dueDate: invoice.due || invoice.dueDate || '',
      createdAt: invoice.gen || invoice.createdAt || '',
      status: invoice.status || 'مكتمل',
    })
    if (opened) toast.success(t('تم فتح الفاتورة للطباعة أو الحفظ بصيغة PDF'))
    else toast.error(t('تعذر فتح الفاتورة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة.'))
  }
  const columns = [
    { accessorKey: 'ref', header: t('مرجع الفاتورة'), cell: ({ row }: any) => <b dir="ltr">{row.original.ref}</b> },
    { accessorKey: 'period', header: t('فترة الفاتورة'), cell: ({ row }: any) => t(row.original.period) },
    { id: 'total', header: t('الإجمالي'), cell: ({ row }: any) => money(row.original.total) },
    { id: 'status', header: t('الحالة'), cell: ({ row }: any) => <StatusBadge value={row.original.status} /> },
    { accessorKey: 'due', header: t('تاريخ الاستحقاق'), cell: ({ row }: any) => arDate(row.original.due) },
    { accessorKey: 'gen', header: t('تاريخ التوليد'), cell: ({ row }: any) => arDate(row.original.gen) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }: any) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض تفاصيل الفاتورة'), onClick: () => navigate('/merchant/records/invoice/' + row.original.ref) },
        { icon: Download, label: t('تنزيل PDF الفاتورة'), onClick: () => generateInvoicePdf(row.original) },
      ]} />) },
  ] as ColumnDef<any, unknown>[]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={(r: any) => r.ref}
        getRowClassName={(r: any) => (r.status === 'متأخرة' ? 'bg-red-50/60' : '')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بمرجع الفاتورة...')} className="pe-9" aria-label={t('بحث في الفواتير')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['تم التوليد', 'تم الإرسال', 'تم العرض', 'مدفوعة', 'متأخرة'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <select className={selectCls} value={period} onChange={e => { setPeriod(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الفترة')}>
              <option value="">{t('كل الفترات')}</option>
              {['ديسمبر 2025', 'يناير 2026'].map(p => <option key={p} value={p}>{t(p)}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('invoices', ['المرجع', 'الفترة', 'الإجمالي', 'الحالة', 'الاستحقاق', 'التوليد'], (data?.rows ?? []).map((x: any) => [x.ref, x.period, x.total, x.status, x.due, x.gen])); toast.success(t('تم تصدير الفواتير الشهرية بنجاح')) }}>{t('تصدير')}</Button>
          </div>
        } />
      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={t('تفاصيل الفاتورة — ') + (viewing?.ref ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => viewing && generateInvoicePdf(viewing)}><FileDown className="size-4" /> {t('تنزيل PDF')}</Button>
        </>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KV k={t("مرجع الفاتورة")} v={viewing.ref} /><KV k={t("فترة الفاتورة")} v={viewing.period} /><KV k={t("اسم التاجر")} v={viewing.m} /><KV k={t("حالة الفاتورة")} v={viewing.status} /><KV k={t("تاريخ الاستحقاق")} v={viewing.due} /><KV k={t("تم التوليد في")} v={viewing.gen} /><KV k={t("تم الإرسال في")} v={viewing.sent ?? '—'} /><KV k={t("المجموع الفرعي")} v={money(viewing.subtotal)} />
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('وصف البند')}</th><th className="p-2 text-start font-extrabold">{t('الكمية')}</th><th className="p-2 text-start font-extrabold">{t('سعر الوحدة')}</th><th className="p-2 text-start font-extrabold">{t('المبلغ')}</th></tr></thead>
              <tbody>
                {viewing.items.map((it: any, i: number) => <tr key={i} className="border-b"><td className="p-2 font-bold">{it.d}</td><td className="p-2">{it.q}</td><td className="p-2">{money(it.u)}</td><td className="p-2">{money(it.q * it.u)}</td></tr>)}
                <tr className="border-b"><td className="p-2 font-bold" colSpan={3}>{t('مبلغ الضريبة')}</td><td className="p-2 font-bold">{money(viewing.tax)}</td></tr>
                <tr><td className="p-2 font-black" colSpan={3}>{t('إجمالي المبلغ المستحق')}</td><td className="p-2 font-black">{money(viewing.total)}</td></tr>
              </tbody>
            </table>
          </div>
        </>}
      </Modal>
    </div>
  )
}
