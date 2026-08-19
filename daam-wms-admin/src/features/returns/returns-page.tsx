import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/tables/data-table'
import { ActionButtons, ConfirmDialog, Modal, StatusBadge, selectCls } from '@/components/common'
import { returnsService } from '@/services/returns.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV, money } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { ReturnRequest } from '@/types'
import { CheckCircle, ClipboardCheck, Eye, Search, Truck, Wallet, XCircle } from 'lucide-react'

const CONDITIONS = ['غير مفتوح', 'مفتوح لكن غير مستخدم', 'مستخدم', 'تالف']
const ITEM_NAMES = ['قهوة عربية مختصة 1كجم', 'بن محمص كولومبي 500جم', 'منظف أرضيات معطر 3لتر']

export default function ReturnsPage() {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('pending')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, tab, page, pageSize: 10 }), [dq, type, tab, page])
  const { data, isLoading } = useQuery({ queryKey: ['returns', qp], queryFn: () => returnsService.list(qp) })

  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [rErr, setRErr] = useState('')
  const [receiving, setReceiving] = useState<ReturnRequest | null>(null)
  const [inspecting, setInspecting] = useState<ReturnRequest | null>(null)
  const [conds, setConds] = useState<{ name: string; condition: string; notes: string }[]>([])
  const [iErr, setIErr] = useState('')
  const [refunding, setRefunding] = useState<ReturnRequest | null>(null)
  const [method, setMethod] = useState<'رصيد المحفظة' | 'تحويل بنكي'>('رصيد المحفظة')
  const [notes, setNotes] = useState('')
  const [fErr, setFErr] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['returns'] })
  const approve = useMutation({ mutationFn: (ref: string) => returnsService.approve(ref), onSuccess: () => { toast.success('تم التحقق بنجاح: تم اعتماد طلب الإرجاع وتوليد بوليصة الشحن بنجاح'); invalidate(); setApproving(null) } })
  const reject = useMutation({ mutationFn: (v: { ref: string; reason: string }) => returnsService.reject(v.ref, v.reason), onSuccess: () => { toast.success('تم التحقق بنجاح: تم رفض طلب الإرجاع بنجاح'); invalidate(); setRejecting(null) } })
  const receive = useMutation({ mutationFn: (ref: string) => returnsService.receive(ref), onSuccess: () => { toast.success('تم التحقق بنجاح: تم تأكيد استلام القطع المرتجعة في المستودع بنجاح'); invalidate(); setReceiving(null) } })
  const inspect = useMutation({ mutationFn: (v: { ref: string; results: { condition: string }[] }) => returnsService.inspect(v.ref, v.results), onSuccess: () => { toast.success('تم التحقق بنجاح: تم تسجيل نتائج الفحص بنجاح'); invalidate(); setInspecting(null) } })
  const refund = useMutation({ mutationFn: (v: { ref: string; method: string; amount: number }) => returnsService.refund(v.ref, v.method, v.amount), onSuccess: () => { toast.success('تم التحقق بنجاح: تم معالجة الاسترداد المالي بنجاح'); invalidate(); setRefunding(null) } })

  const refundAmount = (r: ReturnRequest) => r.count * 180

  const openInspect = (r: ReturnRequest) => {
    setConds(ITEM_NAMES.slice(0, r.count || 1).map(n => ({ name: n, condition: 'غير مفتوح', notes: '' })))
    setIErr('')
    setInspecting(r)
  }

  const columns: ColumnDef<ReturnRequest, unknown>[] = [
    { accessorKey: 'ref', header: t('المرجع'), cell: ({ row }) => <button className="font-bold underline-offset-4 hover:underline" onClick={() => navigate(`/records/return/${row.original.ref}`)}>{row.original.ref}</button> },
    { accessorKey: 'm', header: t('التاجر') },
    { accessorKey: 'order', header: t('الطلب الأصلي'), cell: ({ row }) => <button className="font-bold text-primary underline-offset-4 hover:underline" onClick={() => navigate(`/records/order/${row.original.order}`)}>{row.original.order}</button> },
    { accessorKey: 'cust', header: t('العميل') },
    { accessorKey: 'count', header: t('القطع') },
    { id: 'type', header: t('النوع'), cell: ({ row }) => <StatusBadge value={row.original.type} /> },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'date', header: t('التاريخ'), cell: ({ row }) => arDate(row.original.date) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => {
      const r = row.original
      return (
      <ActionButtons actions={[
        { icon: Eye, label: 'عرض التفاصيل', onClick: () => navigate(`/records/return/${r.ref}`) },
        { icon: CheckCircle, label: 'اعتماد الطلب', onClick: () => setApproving(r.ref), hidden: r.status !== 'معلق' },
        { icon: XCircle, label: 'رفض الطلب', variant: 'destructive', onClick: () => { setRejecting(r.ref); setReason(''); setRErr('') }, hidden: r.status !== 'معلق' },
        { icon: Truck, label: 'استلام القطع', onClick: () => setReceiving(r), hidden: r.status !== 'في الطريق' },
        { icon: ClipboardCheck, label: 'فحص القطع', onClick: () => openInspect(r), hidden: r.status !== 'مستلم' },
        { icon: Wallet, label: 'معالجة الاسترداد', onClick: () => { setRefunding(r); setMethod('رصيد المحفظة'); setNotes(''); setFErr('') }, hidden: r.status !== 'تم الفحص' },
      ]} />) } },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1) }} className="border-b px-3 pt-2">
        <TabsList className="bg-transparent">
          <TabsTrigger value="pending">{t('الطلبات المعلقة')}</TabsTrigger>
          <TabsTrigger value="all">{t('جميع طلبات الإرجاع')}</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={(r: ReturnRequest) => r.ref}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-sm">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بالمرجع أو الطلب الأصلي أو التاجر أو العميل...')} className="pe-9" aria-label={t('بحث بالمرجع أو الطلب الأصلي أو التاجر أو العميل...')} />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label={t('تصفية حسب النوع')}>
              <option value="">{t('كل الأنواع')}</option>
              <option value="إرجاع للمخزون">{t('إرجاع للمخزون')}</option>
              <option value="إرجاع للتاجر">{t('إرجاع للتاجر')}</option>
              <option value="إتلاف">{t('إتلاف')}</option>
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('returns', ['المرجع', 'التاجر', 'البريد', 'الطلب الأصلي', 'العميل', 'القطع', 'النوع', 'الحالة', 'التاريخ'], (data?.rows ?? []).map(r => [r.ref, r.m, r.email, r.order, r.cust, r.count, r.type, r.status, r.date])); toast.success('تم تصدير الملف بنجاح') }}>{t('تصدير')}</Button>
          </div>
        } />

      <ConfirmDialog open={!!approving} onOpenChange={v => { if (!v) setApproving(null) }} title="اعتماد طلب الإرجاع" loading={approve.isPending}
        description={'هل أنت متأكد من اعتماد طلب الإرجاع ' + (approving ?? '') + '؟ سيتم توليد بوليصة شحن الإرجاع وإرسال التعليمات للتاجر والعميل.'}
        confirmLabel="اعتماد" onConfirm={() => approve.mutate(approving!)} />

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={'رفض طلب الإرجاع — ' + (rejecting ?? '')}
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

      <ConfirmDialog open={!!receiving} onOpenChange={v => { if (!v) setReceiving(null) }} title="استلام القطع المرتجعة" loading={receive.isPending}
        description={receiving ? <>التاجر: <b>{receiving.m}</b> — الطلب الأصلي: <b>{receiving.order}</b><br />القطع المتوقعة: <b>{receiving.count}</b> — تأكيد الاستلام الفعلي وتحديث الحالة إلى "مستلم"؟</> : undefined}
        confirmLabel="تأكيد الاستلام" onConfirm={() => receive.mutate(receiving!.ref)} />

      <Modal open={!!inspecting} onClose={() => setInspecting(null)} wide title={'فحص القطع المرتجعة — ' + (inspecting?.ref ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setInspecting(null)}>إلغاء</Button>
          <Button disabled={inspect.isPending} onClick={() => {
            if (conds.some(c => !c.condition)) { setIErr('الحالة الفعلية مطلوبة لكل القطع'); return }
            if (conds.some(c => c.notes.length > 300)) { setIErr('ملاحظات الفاحص يجب أن تكون أقل من 300 حرف'); return }
            setIErr('')
            inspect.mutate({ ref: inspecting!.ref, results: conds })
          }}>إكمال الفحص</Button>
        </>}>
        <div className="space-y-3">
          {conds.map((c, i) => (
            <div key={i} className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-[13px] font-extrabold">{ITEM_NAMES[i % ITEM_NAMES.length]} — كمية 1</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>الحالة الفعلية <span className="text-destructive">*</span></Label>
                  <select className={selectCls + ' w-full'} value={c.condition} onChange={e => setConds(s => s.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))}>
                    <option value="">اختر الحالة...</option>
                    {CONDITIONS.map(x => <option key={x} value={x}>{x}</option>)}
                  </select></div>
                <div><Label>ملاحظات الفاحص (اختياري — 300 حرف)</Label>
                  <Input value={c.notes} maxLength={300} onChange={e => setConds(s => s.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} /></div>
              </div>
            </div>
          ))}
        </div>
        {iErr && <p className="mt-2 text-xs font-bold text-destructive">{iErr}</p>}
      </Modal>

      <Modal open={!!refunding} onClose={() => setRefunding(null)} title={'معالجة الاسترداد — ' + (refunding?.ref ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRefunding(null)}>إلغاء</Button>
          <Button disabled={refund.isPending} onClick={() => {
            if (notes.length > 300) { setFErr('ملاحظات الاسترداد يجب أن تكون أقل من 300 حرف'); return }
            setFErr('')
            refund.mutate({ ref: refunding!.ref, method, amount: refundAmount(refunding!) })
          }}>تأكيد الاسترداد</Button>
        </>}>
        {refunding && <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {[['إجمالي الطلب الأصلي', money(refundAmount(refunding) + 25)], ['تكلفة الشحن (غير مستردة)', money(25)], ['الخصومات (قطع تالفة)', money(0)], ['صافي المبلغ المسترد', money(refundAmount(refunding))]].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>{t('طريقة الاسترداد')} <span className="text-destructive">*</span></Label>
              <select className={selectCls + ' w-full'} value={method} onChange={e => setMethod(e.target.value as 'رصيد المحفظة' | 'تحويل بنكي')}>
                <option value="رصيد المحفظة">{t('رصيد المحفظة')}</option>
                <option value="تحويل بنكي">{t('تحويل بنكي')}</option>
              </select></div>
            <div><Label>ملاحظات (اختياري — 300 حرف)</Label><Input value={notes} maxLength={300} onChange={e => setNotes(e.target.value)} /></div>
          </div>
          {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
        </>}
      </Modal>
    </div>
  )
}
