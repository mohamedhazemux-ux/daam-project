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
import { ConfirmDialog, Modal, StatusBadge, selectCls } from '@/components/common'
import { returnsService } from '@/services/returns.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV, money } from '@/lib/utils'
import type { ReturnRequest } from '@/types'
import { Search } from 'lucide-react'

const CONDITIONS = ['غير مفتوح', 'مفتوح لكن غير مستخدم', 'مستخدم', 'تالف']
const ITEM_NAMES = ['قهوة عربية مختصة 1كجم', 'بن محمص كولومبي 500جم', 'منظف أرضيات معطر 3لتر']

export default function ReturnsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('pending')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, tab, type, page, pageSize: 10 }), [dq, tab, type, page])
  const { data, isLoading } = useQuery({ queryKey: ['returns', qp], queryFn: () => returnsService.list(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['returns'] })

  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [rErr, setRErr] = useState('')
  const [viewing, setViewing] = useState<ReturnRequest | null>(null)
  const [receiving, setReceiving] = useState<ReturnRequest | null>(null)
  const [inspecting, setInspecting] = useState<ReturnRequest | null>(null)
  const [conds, setConds] = useState<{ condition: string; notes: string }[]>([])
  const [iErr, setIErr] = useState('')
  const [refunding, setRefunding] = useState<ReturnRequest | null>(null)
  const [method, setMethod] = useState('رصيد المحفظة')
  const [notes, setNotes] = useState('')
  const [fErr, setFErr] = useState('')

  const approve = useMutation({ mutationFn: (ref: string) => returnsService.approve(ref), onSuccess: () => { toast.success('تمت الموافقة على طلب الإرجاع بنجاح'); invalidate(); setApproving(null) } })
  const reject = useMutation({ mutationFn: (v: { ref: string; reason: string }) => returnsService.reject(v.ref, v.reason), onSuccess: () => { toast.success('تم رفض طلب الإرجاع بنجاح — تم إشعار التاجر والعميل بسبب الرفض'); invalidate(); setRejecting(null) } })
  const receive = useMutation({ mutationFn: (ref: string) => returnsService.receive(ref), onSuccess: () => { toast.success('تم استلام القطع المرتجعة بنجاح'); invalidate(); setReceiving(null) }, onError: e => toast.error((e as Error).message) })
  const inspect = useMutation({
    mutationFn: (v: { ref: string; results: { condition: string }[] }) => returnsService.inspect(v.ref, v.results),
    onSuccess: d => { toast.success('تم الانتهاء من الفحص بنجاح — للمخزون: ' + d.toStock + ' | للتاجر: ' + d.toMerchant + ' | إتلاف: ' + d.dispose); invalidate(); setInspecting(null) },
    onError: e => toast.error((e as Error).message),
  })
  const refund = useMutation({
    mutationFn: (v: { ref: string; method: string; amount: number }) => returnsService.refund(v.ref, v.method, v.amount),
    onSuccess: tx => { toast.success('تمت معالجة الاسترداد بنجاح — مرجع العملية: ' + tx); invalidate(); setRefunding(null) },
    onError: e => toast.error((e as Error).message),
  })

  const openInspect = (r: ReturnRequest) => {
    setInspecting(r)
    setIErr('')
    setConds(Array.from({ length: r.count }, () => ({ condition: '', notes: '' })))
  }
  const refundAmount = (r: ReturnRequest) => r.count * 180

  const columns: ColumnDef<ReturnRequest, unknown>[] = [
    { accessorKey: 'ref', header: 'مرجع الإرجاع', cell: ({ row }) => <button className="font-bold underline-offset-4 hover:underline" onClick={() => navigate(`/records/return/${row.original.ref}`)}>{row.original.ref}</button> },
    { id: 'merchant', header: 'التاجر', cell: ({ row }) => <div><p className="font-bold">{row.original.m}</p><p className="text-[11px] text-muted-foreground">{row.original.email}</p></div> },
    { accessorKey: 'order', header: 'الطلب الأصلي' },
    { accessorKey: 'cust', header: 'العميل' },
    { accessorKey: 'count', header: 'القطع' },
    { accessorKey: 'type', header: 'النوع' },
    { id: 'date', header: 'التاريخ', cell: ({ row }) => arDate(row.original.date) },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => { const r = row.original; return (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => navigate(`/records/return/${r.ref}`)}>عرض</Button>
        {r.status === 'معلق' && <>
          <Button size="sm" variant="outline" onClick={() => setApproving(r.ref)}>اعتماد</Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setRejecting(r.ref); setReason(''); setRErr('') }}>رفض</Button>
        </>}
        {r.status === 'في الطريق' && <Button size="sm" variant="outline" onClick={() => setReceiving(r)}>استلام القطع</Button>}
        {r.status === 'مستلم' && <Button size="sm" variant="outline" onClick={() => openInspect(r)}>فحص القطع</Button>}
        {r.status === 'تم الفحص' && <Button size="sm" variant="outline" onClick={() => { setRefunding(r); setMethod('رصيد المحفظة'); setNotes(''); setFErr('') }}>معالجة الاسترداد</Button>}
      </div>) } },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1) }} className="border-b px-3 pt-2">
        <TabsList className="bg-transparent">
          <TabsTrigger value="pending">الطلبات المعلقة</TabsTrigger>
          <TabsTrigger value="all">جميع طلبات الإرجاع</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-sm">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث بمرجع الإرجاع أو الطلب الأصلي أو التاجر أو العميل..." className="pe-9" aria-label="بحث في المرتجعات" />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label="تصفية حسب النوع">
              <option value="">كل الأنواع</option>
              <option value="إرجاع للمخزون">إرجاع للمخزون</option>
              <option value="إرجاع للتاجر">إرجاع للتاجر</option>
              <option value="إتلاف">إتلاف</option>
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('returns', ['المرجع', 'التاجر', 'البريد', 'الطلب الأصلي', 'العميل', 'القطع', 'النوع', 'الحالة', 'التاريخ'], (data?.rows ?? []).map(r => [r.ref, r.m, r.email, r.order, r.cust, r.count, r.type, r.status, r.date])); toast.success('تم تصدير الملف بنجاح') }}>تصدير</Button>
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
            <div><Label>طريقة الاسترداد <span className="text-destructive">*</span></Label>
              <select className={selectCls + ' w-full'} value={method} onChange={e => setMethod(e.target.value)}>
                <option value="رصيد المحفظة">رصيد المحفظة</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
              </select></div>
            <div><Label>ملاحظات (اختياري — 300 حرف)</Label><Input value={notes} maxLength={300} onChange={e => setNotes(e.target.value)} /></div>
          </div>
          {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
        </>}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={'تفاصيل طلب الإرجاع — ' + (viewing?.ref ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setViewing(null)}>إغلاق</Button>
        </>}>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['مرجع الإرجاع', viewing.ref],
                ['التاجر', viewing.m],
                ['الطلب الأصلي', viewing.order],
                ['العميل', viewing.cust],
                ['القطع', String(viewing.count)],
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
