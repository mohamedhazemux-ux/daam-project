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
import { merchantReturnsService, RETURN_REASONS, RETURN_CONDITIONS, type MerchantReturn, type ReturnItem } from '@/services/merchant-returns.service'
import { useAuthStore } from '@/store/auth-store'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { downloadCSV } from '@/lib/utils'
import { Plus, Search, Trash2 } from 'lucide-react'
export default function MerchantReturnsPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, type, from, to, page, pageSize: 10, store: user?.store ?? '' }), [dq, status, type, from, to, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-returns', qp], queryFn: () => merchantReturnsService.list(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['m-returns'] })
  const [createOpen, setCreateOpen] = useState(false)
  const [orderRef, setOrderRef] = useState('')
  const [items, setItems] = useState<ReturnItem[]>([])
  const [form, setForm] = useState({ type: '', refundMethod: '', notes: '' })
  const [fErr, setFErr] = useState('')
  const [viewing, setViewing] = useState<MerchantReturn | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const { data: delivered } = useQuery({ queryKey: ['m-delivered', user?.store], queryFn: () => merchantReturnsService.deliveredOrders(user!.store!) })
  const order = (delivered ?? []).find(o => o.ref === orderRef)
  const create = useMutation({
    mutationFn: () => merchantReturnsService.create(user!.store!, user!.email, { orderRef, cust: order?.cust ?? '', phone: '0512345678', deliveredAt: order?.date ?? '', items, type: form.type, refundMethod: form.refundMethod, notes: form.notes }),
    onSuccess: () => { toast.success('تم إرسال طلب الإرجاع بنجاح'); invalidate(); setCreateOpen(false) },
  })
  const cancel = useMutation({ mutationFn: (ref: string) => merchantReturnsService.cancel(ref), onSuccess: (_, ref) => { toast.success('تم إلغاء طلب الإرجاع ' + ref + ' بنجاح'); invalidate(); setCancelling(null); setViewing(null) }, onError: e => toast.error((e as Error).message) })
  const allowed = useMemo(() => {
    const s = new Set<string>()
    items.forEach(i => {
      if (i.condition === 'غير مفتوح' || i.condition === 'مفتوح لكن غير مستخدم') s.add('إرجاع للمخزون')
      if (i.condition === 'مستخدم') s.add('إرجاع للتاجر')
      if (i.condition === 'تالف') { s.add('إرجاع للتاجر'); s.add('إتلاف') }
    })
    return s
  }, [items])
  const onImages = (i: number, list: FileList | null) => {
    if (!list) return
    const arr = Array.from(list)
    const cur = items[i].images
    if (cur.length + arr.length > 5) { setFErr('الحد الأقصى 5 صور'); return }
    for (const f of arr) {
      if (!/\.(jpg|png|jpeg)$/i.test(f.name)) { setFErr('امتداد غير صالح، يرجى رفع صورة بصيغة JPG أو PNG أو JPEG'); return }
      if (f.size > 5 * 1024 * 1024) { setFErr('الحجم الأقصى للصورة 5 ميجابايت، يرجى استخدام صورة أخرى'); return }
    }
    setFErr('')
    setItems(s => s.map((x, j) => j === i ? { ...x, images: [...x.images, ...arr.map(f => f.name)] } : x))
  }
  const submit = () => {
    if (!orderRef) { setFErr('الطلب الأصلي مطلوب'); return }
    if (items.length === 0) { setFErr('مطلوب صنف مرتجع واحد على الأقل'); return }
    for (const it of items) {
      if (!it.name) { setFErr('المنتج مطلوب'); return }
      const ordered = order?.items.find(x => x.name === it.name)?.qty ?? 0
      if (!it.qty) { setFErr('الكمية المرتجعة مطلوبة'); return }
      if (it.qty < 1) { setFErr('يجب أن تكون الكمية المرتجعة 1 على الأقل'); return }
      if (it.qty > ordered) { setFErr('يجب أن تكون الكمية المرتجعة أقل من أو تساوي الكمية المطلوبة أصلًا'); return }
      if (!it.reason) { setFErr('سبب الإرجاع مطلوب'); return }
      if (!it.condition) { setFErr('حالة الصنف المرتجع مطلوبة'); return }
    }
    if (!form.type) { setFErr('نوع الإرجاع مطلوب'); return }
    if (allowed.size > 0 && !allowed.has(form.type)) { setFErr('نوع الإرجاع غير متوافق مع حالات الأصناف المحددة'); return }
    if (!form.refundMethod) { setFErr('طريقة الاسترداد المفضلة مطلوبة'); return }
    if (form.notes.length > 500) { setFErr('يجب أن تكون ملاحظات الإرجاع أقل من 500 حرف'); return }
    setFErr('')
    create.mutate()
  }
  const columns: ColumnDef<MerchantReturn, unknown>[] = [
    { accessorKey: 'ref', header: 'مرجع الإرجاع', cell: ({ row }) => <b>{row.original.ref}</b> },
    { accessorKey: 'order', header: 'الطلب الأصلي' },
    { accessorKey: 'cust', header: 'العميل' },
    { accessorKey: 'totalItems', header: 'إجمالي الأصناف المرتجعة' },
    { accessorKey: 'type', header: 'نوع الإرجاع' },
    { id: 'status', header: 'حالة الإرجاع', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { accessorKey: 'createdAt', header: 'تاريخ الإنشاء' },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => setViewing(row.original)}>عرض التفاصيل</Button>
        {row.original.status === 'معلق' && <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setCancelling(row.original.ref)}>إلغاء</Button>}
      </div>) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث بالمرجع أو الطلب أو العميل..." className="pe-9" aria-label="بحث في المرتجعات" />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              {['معلق', 'معتمد', 'مرفوض', 'في الطريق', 'مستلم', 'تم الفحص', 'تم الاسترداد', 'ملغي'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label="تصفية حسب النوع">
              <option value="">كل الأنواع</option>
              {['إرجاع للمخزون', 'إرجاع للتاجر', 'إتلاف'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input type="date" className="w-36" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} aria-label="من تاريخ" />
            <Input type="date" className="w-36" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} aria-label="إلى تاريخ" />
            <Button variant="outline" size="sm" onClick={() => { setStatus(''); setType(''); setFrom(''); setTo(''); setPage(1) }}>إعادة التعيين</Button>
            <div className="ms-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { downloadCSV('my-returns', ['المرجع', 'الطلب الأصلي', 'العميل', 'الأصناف', 'النوع', 'الحالة', 'طريقة الاسترداد', 'التاريخ'], (data?.rows ?? []).map(r => [r.ref, r.order, r.cust, r.totalItems, r.type, r.status, r.refundMethod, r.createdAt])); toast.success('تم تصدير طلبات الإرجاع بنجاح') }}>تصدير</Button>
              <Button size="sm" onClick={() => { setOrderRef(''); setItems([]); setForm({ type: '', refundMethod: '', notes: '' }); setFErr(''); setCreateOpen(true) }}><Plus className="size-4" /> إنشاء طلب إرجاع</Button>
            </div>
          </div>
        } />
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} wide title="إنشاء طلب إرجاع"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button><Button disabled={create.isPending} onClick={submit}>إرسال طلب الإرجاع</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>الطلب الأصلي (الطلبات المسلّمة فقط) <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={orderRef} onChange={e => { setOrderRef(e.target.value); setItems([]) }}>
              <option value="">اختر الطلب...</option>
              {(delivered ?? []).map(o => <option key={o.ref} value={o.ref}>{o.ref} — {o.cust}</option>)}
            </select></div>
          {order && <>
            {([['مرجع الطلب', order.ref], ['اسم العميل', order.cust], ['رقم جوال العميل', '0512345678'], ['تاريخ التسليم', order.date]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
          </>}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-extrabold">الأصناف المرتجعة <span className="text-destructive">*</span></p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-lg border bg-muted/40 p-2 md:grid-cols-2">
                <select className={selectCls} value={it.name} onChange={e => setItems(s => s.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} aria-label="المنتج">
                  <option value="">اختر المنتج...</option>
                  {(order?.items ?? []).map(p => <option key={p.name} value={p.name}>{p.name} (طلب: {p.qty})</option>)}
                </select>
                <Input type="number" min={1} value={it.qty || ''} onChange={e => setItems(s => s.map((x, j) => j === i ? { ...x, qty: +e.target.value } : x))} aria-label="الكمية المرتجعة" />
                <select className={selectCls} value={it.reason} onChange={e => setItems(s => s.map((x, j) => j === i ? { ...x, reason: e.target.value } : x))} aria-label="سبب الإرجاع">
                  <option value="">سبب الإرجاع...</option>
                  {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select className={selectCls} value={it.condition} onChange={e => setItems(s => s.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))} aria-label="حالة الصنف">
                  <option value="">حالة الصنف المرتجع...</option>
                  {RETURN_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <Input type="file" multiple accept=".jpg,.png,.jpeg" className="flex-1" onChange={e => onImages(i, e.target.files)} aria-label="صور الصنف" />
                  <Button variant="outline" size="icon" className="size-9 text-destructive" onClick={() => setItems(s => s.filter((_, j) => j !== i))} aria-label="حذف الصنف"><Trash2 className="size-4" /></Button>
                </div>
                {it.images.length > 0 && <p className="md:col-span-2 text-[11px] font-bold text-muted-foreground">{it.images.map(x => '🖼 ' + x).join('  ')}</p>}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setItems(s => [...s, { name: '', qty: 1, reason: '', condition: '', images: [], ref: 'PRD-00' + (s.length + 1) }])}>إضافة صنف مرتجع</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div><Label>نوع الإرجاع <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="">اختر النوع...</option>
              {['إرجاع للمخزون', 'إرجاع للتاجر', 'إتلاف'].filter(t => allowed.size === 0 || allowed.has(t)).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {allowed.size > 0 && <p className="mt-1 text-[11px] font-bold text-muted-foreground">الأنواع المتاحة مفلترة حسب حالات الأصناف المحددة</p>}</div>
          <div><Label>طريقة الاسترداد المفضلة <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.refundMethod} onChange={e => setForm(f => ({ ...f, refundMethod: e.target.value }))}>
              <option value="">اختر...</option>
              <option value="رصيد المحفظة">رصيد المحفظة</option>
              <option value="تحويل بنكي">تحويل بنكي</option>
            </select></div>
          <div className="md:col-span-2"><Label>ملاحظات الإرجاع (اختياري — 500 حرف)</Label><Textarea maxLength={500} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={'تفاصيل طلب الإرجاع — ' + (viewing?.ref ?? '')}
        footer={<>
          {viewing?.status === 'معلق' && <Button variant="destructive" onClick={() => setCancelling(viewing.ref)}>إلغاء الطلب</Button>}
        </>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            {([['الطلب الأصلي', viewing.order], ['العميل', viewing.cust], ['رقم الجوال', viewing.phone], ['إجمالي الأصناف', String(viewing.totalItems)], ['نوع الإرجاع', viewing.type], ['طريقة الاسترداد', viewing.refundMethod], ['الحالة', viewing.status], ['تاريخ الإنشاء', viewing.createdAt]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المنتج</th><th className="p-2 text-start font-extrabold">المرجع</th><th className="p-2 text-start font-extrabold">الكمية</th><th className="p-2 text-start font-extrabold">السبب</th><th className="p-2 text-start font-extrabold">الحالة</th><th className="p-2 text-start font-extrabold">الصور</th></tr></thead>
              <tbody>{viewing.items.map((i, idx) => (
                <tr key={idx} className="border-b"><td className="p-2 font-bold">{i.name}</td><td className="p-2"><span dir="ltr">{i.ref}</span></td><td className="p-2">{i.qty}</td><td className="p-2">{i.reason}</td><td className="p-2">{i.condition}</td><td className="p-2 text-[11px]">{i.images.length ? i.images.map(x => '🖼 ' + x).join(' ') : '—'}</td></tr>))}
              </tbody></table>
          </div>
          <p className="mb-1 mt-3 text-xs font-extrabold text-muted-foreground">ملاحظات الإرجاع</p>
          <p className="mb-3 rounded-lg border bg-muted/40 p-3 text-[13px] font-bold">{viewing.notes || '—'}</p>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">الخط الزمني للحالات</p>
          <div className="space-y-1">{viewing.timeline.map((t, i) => <p key={i} className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {t}</p>)}</div>
        </>}
      </Modal>
      <ConfirmDialog open={!!cancelling} onOpenChange={v => { if (!v) setCancelling(null) }} destructive title="إلغاء طلب الإرجاع" loading={cancel.isPending}
        description={'هل أنت متأكد من رغبتك في إلغاء طلب الإرجاع: ' + (cancelling ?? '') + '؟'}
        confirmLabel="إلغاء الطلب" onConfirm={() => cancel.mutate(cancelling!)} />
    </div>
  )
}
