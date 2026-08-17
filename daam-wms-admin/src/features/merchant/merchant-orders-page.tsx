import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/tables/data-table'
import { ConfirmDialog, Modal, StatusBadge, selectCls } from '@/components/common'
import { merchantOrdersService, SHIP_METHODS, type MerchantOrder, type OrderItem } from '@/services/merchant-orders.service'
import { merchantSettingsService } from '@/services/merchant-settings.service'
import { useAuthStore } from '@/store/auth-store'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { downloadCSV, money } from '@/lib/utils'
import { Download, Plus, Search, Trash2 } from 'lucide-react'
export default function MerchantOrdersPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [ship, setShip] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, ship, page, pageSize: 10, store: user?.store ?? '' }), [dq, status, ship, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-orders', qp], queryFn: () => merchantOrdersService.list(qp) })
  const { data: opts } = useQuery({ queryKey: ['m-order-opts', user?.store], queryFn: () => merchantOrdersService.options(user!.store!) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['m-orders'] })
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ cust: '', address: '', shipResp: merchantSettingsService.loadSync(user?.store ?? '').defaultShip as '' | 'منصة' | 'ذاتي', method: '', tracking: '', label: '' })
  const [items, setItems] = useState<OrderItem[]>([{ name: '', qty: 1, price: 0, notes: '' }])
  const [fErr, setFErr] = useState('')
  const [viewing, setViewing] = useState<MerchantOrder | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const create = useMutation({ mutationFn: () => merchantOrdersService.create(user!.store!, { ...form, shipResp: form.shipResp as 'منصة' | 'ذاتي', items }), onSuccess: () => { toast.success('تم إنشاء الطلب بنجاح'); invalidate(); setCreateOpen(false) } })
  const cancel = useMutation({ mutationFn: (ref: string) => merchantOrdersService.cancel(ref), onSuccess: () => { toast.success('تم إلغاء الطلب بنجاح'); invalidate(); setCancelling(null); setViewing(null) }, onError: e => toast.error((e as Error).message) })
  const onLabel = (f: File | null) => {
    if (!f) return
    if (!/\.(pdf|png|jpg|jpeg)$/i.test(f.name)) { setFErr('امتداد غير صالح، يرجى رفع ملف بصيغة PDF أو PNG أو JPG أو JPEG'); return }
    if (f.size > 5 * 1024 * 1024) { setFErr('الحجم الأقصى للملف 5 ميجابايت، يرجى استخدام ملف آخر'); return }
    setFErr('')
    setForm(x => ({ ...x, label: f.name }))
  }
  const setItem = (i: number, patch: Partial<OrderItem>) => setItems(s => s.map((x, j) => {
    if (j !== i) return x
    const next = { ...x, ...patch }
    if (patch.name !== undefined) {
      const mine = opts?.mine.find(p => p.name === patch.name)
      const plat = opts?.platform.find(p => p.name === patch.name)
      next.price = mine?.price ?? plat?.price ?? 0
      next.platform = !!plat
    }
    return next
  }))
  const submit = () => {
    if (!form.cust.trim()) { setFErr('العميل مطلوب'); return }
    if (!form.address.trim()) { setFErr('عنوان الشحن مطلوب'); return }
    if (!form.shipResp) { setFErr('مسؤولية الشحن مطلوبة'); return }
    if (form.shipResp === 'منصة' && !form.method) { setFErr('طريقة الشحن مطلوبة'); return }
    if (form.shipResp === 'ذاتي' && !form.label) { setFErr('ملصق الشحن مطلوب لطلبات الشحن الذاتي'); return }
    if (form.tracking && (form.tracking.length < 5 || form.tracking.length > 100)) { setFErr('يجب أن يكون رقم التتبع بين 5 إلى 100'); return }
    if (items.length === 0) { setFErr('أضف منتجًا واحدًا على الأقل للطلب'); return }
    for (const it of items) {
      if (!it.name) { setFErr('اسم المنتج مطلوب'); return }
      if (!it.qty) { setFErr('الكمية مطلوبة'); return }
      if (it.qty < 1) { setFErr('يجب أن تكون الكمية أكبر من 0'); return }
      if (it.platform && it.qty > 10000) { setFErr('يجب أن تكون الكمية المطلوبة أقل من 10000'); return }
      if ((it.notes ?? '').length > 500) { setFErr('الملاحظات يجب أن تكون أقل من 500 حرف'); return }
    }
    setFErr('')
    create.mutate()
  }
  const columns: ColumnDef<MerchantOrder, unknown>[] = [
    { accessorKey: 'ref', header: 'رقم الطلب', cell: ({ row }) => <b>{row.original.ref}</b> },
    { accessorKey: 'cust', header: 'العميل' },
    { accessorKey: 'date', header: 'تاريخ الطلب' },
    { id: 'items', header: 'المنتجات', cell: ({ row }) => row.original.items.map(i => i.name).join('، ').slice(0, 40) + '…' },
    { id: 'qty', header: 'الكمية الإجمالية', cell: ({ row }) => row.original.items.reduce((s, i) => s + i.qty, 0) },
    { id: 'total', header: 'السعر الإجمالي', cell: ({ row }) => <b>{money(row.original.total)}</b> },
    { id: 'ship', header: 'مسؤولية الشحن', cell: ({ row }) => <StatusBadge value={row.original.shipResp} /> },
    { id: 'status', header: 'حالة الطلب', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => setViewing(row.original)}>عرض التفاصيل</Button>
        {row.original.status === 'معلق' && <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setCancelling(row.original.ref)}>إلغاء الطلب</Button>}
      </div>) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث برقم الطلب أو العميل أو المنتج..." className="pe-9" aria-label="بحث في الطلبات" />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              {['معلق', 'قيد المعالجة', 'جاري الشحن', 'مكتمل', 'ارجاع', 'ملغي'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={selectCls} value={ship} onChange={e => { setShip(e.target.value); setPage(1) }} aria-label="تصفية حسب مسؤولية الشحن">
              <option value="">مسؤولية الشحن: الكل</option>
              <option value="منصة">شحن المنصة</option>
              <option value="ذاتي">الشحن الذاتي</option>
            </select>
            <div className="ms-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { downloadCSV('my-orders', ['الرقم', 'العميل', 'التاريخ', 'الحالة', 'الشحن', 'الإجمالي'], (data?.rows ?? []).map(o => [o.ref, o.cust, o.date, o.status, o.shipResp, o.total])); toast.success('تم تصدير قائمة الطلبات بنجاح') }}>تصدير</Button>
              <Button size="sm" onClick={() => { setForm({ cust: '', address: '', shipResp: '', method: '', tracking: '', label: '' }); setItems([{ name: '', qty: 1, price: 0, notes: '' }]); setFErr(''); setCreateOpen(true) }}><Plus className="size-4" /> إنشاء طلب</Button>
            </div>
          </div>
        } />
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} wide title="إنشاء طلب جديد"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button><Button disabled={create.isPending} onClick={submit}>حفظ الطلب</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>العميل <span className="text-destructive">*</span></Label><Input value={form.cust} onChange={e => setForm(f => ({ ...f, cust: e.target.value }))} /></div>
          <div><Label>عنوان الشحن <span className="text-destructive">*</span></Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><Label>مسؤولية الشحن <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.shipResp} onChange={e => setForm(f => ({ ...f, shipResp: e.target.value as '' | 'منصة' | 'ذاتي' }))}>
              <option value="">اختر...</option>
              <option value="منصة">شحن المنصة (تتولى خدمة الطرف الثالث الشحن)</option>
              <option value="ذاتي">الشحن الذاتي (يتولى التاجر الشحن)</option>
            </select></div>
          {form.shipResp === 'منصة' && <>
            <div><Label>طريقة الشحن <span className="text-destructive">*</span></Label>
              <select className={selectCls + ' w-full'} value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                <option value="">اختر...</option>
                {SHIP_METHODS.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select></div>
            <div><Label>تكلفة الشحن (للعرض فقط)</Label><Input dir="ltr" readOnly value={form.method ? money(SHIP_METHODS.find(m => m.name === form.method)?.cost ?? 0) : '—'} /></div>
          </>}
          {form.shipResp === 'ذاتي' && <>
            <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">لقد اخترت الشحن الذاتي. يرجى إرفاق بوليصة شحنك لإتمام الطلب — يرجى إرفاق بوليصة شحن لإتمام الطلب.</div>
            <div><Label>بوليصة الشحن (PDF/PNG/JPG/JPEG حتى 5MB) <span className="text-destructive">*</span></Label><Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => onLabel(e.target.files?.[0] ?? null)} />{form.label && <p className="mt-1 text-[11px] font-bold text-muted-foreground">📎 {form.label}</p>}</div>
            <div><Label>رقم التتبع (اختياري — 5 إلى 100 حرف)</Label><Input dir="ltr" value={form.tracking} onChange={e => setForm(f => ({ ...f, tracking: e.target.value }))} /></div>
          </>}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-extrabold">المنتجات <span className="text-destructive">*</span></p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-lg border bg-muted/40 p-2 md:grid-cols-[1fr_110px_1fr_40px]">
                <select className={selectCls} value={it.name} onChange={e => setItem(i, { name: e.target.value })} aria-label="المنتج">
                  <option value="">اختر المنتج...</option>
                  <optgroup label="منتجاتي">{(opts?.mine ?? []).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</optgroup>
                  <optgroup label="منتجات المنصة">{(opts?.platform ?? []).map(p => <option key={p.name} value={p.name}>{p.name} (منصة)</option>)}</optgroup>
                </select>
                <Input type="number" min={1} value={it.qty || ''} onChange={e => setItem(i, { qty: +e.target.value })} aria-label="الكمية" />
                <Input value={it.notes ?? ''} maxLength={500} onChange={e => setItem(i, { notes: e.target.value })} placeholder="ملاحظات (اختياري)" aria-label="ملاحظات العنصر" />
                <Button variant="outline" size="icon" className="size-9 text-destructive" onClick={() => setItems(s => s.filter((_, j) => j !== i))} aria-label="حذف العنصر"><Trash2 className="size-4" /></Button>
                {it.platform && <p className="md:col-span-4 text-[11px] font-bold text-violet-700">منتج منصة — لا يُتحقق من المخزون (الحد الأقصى 10000)</p>}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setItems(s => [...s, { name: '', qty: 1, price: 0, notes: '' }])}>إضافة منتج</Button>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={'تفاصيل الطلب — ' + (viewing?.ref ?? '')}
        footer={<>
          {viewing?.shipResp === 'ذاتي' && viewing.label && <Button variant="outline" onClick={() => toast.success('تم تنزيل بوليصة الشحن الخاصة بالطلب')}><Download className="size-4" /> تنزيل بوليصة الشحن</Button>}
          {viewing?.status === 'معلق' && <Button variant="destructive" onClick={() => setCancelling(viewing.ref)}>إلغاء الطلب</Button>}
        </>}>
        {viewing && <>
          {viewing.shipResp === 'ذاتي' && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">هذا الطلب يتم شحنه ذاتيا من قبل التاجر. ملصق شحن المنصة غير قابل للتطبيق.</div>}
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            {([['العميل', viewing.cust], ['عنوان الشحن', viewing.address], ['التاريخ', viewing.date], ['مسؤولية الشحن', viewing.shipResp === 'منصة' ? 'شحن المنصة' : 'الشحن الذاتي'], ['طريقة الشحن', viewing.shipResp === 'منصة' ? (viewing.method ?? '—') : 'ذاتي — الملصق في الملف'], ['رقم التتبع', viewing.tracking ?? '—'], ['الإجمالي', money(viewing.total)], ['الحالة', viewing.status]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المنتج</th><th className="p-2 text-start font-extrabold">الكمية</th><th className="p-2 text-start font-extrabold">السعر</th></tr></thead>
              <tbody>{viewing.items.map((i, idx) => (
                <tr key={idx} className="border-b"><td className="p-2 font-bold">{i.name} {i.platform && <span className="ms-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10.5px] font-extrabold text-violet-700">منتج منصة</span>}</td><td className="p-2">{i.qty}</td><td className="p-2">{money(i.price)}</td></tr>))}
              </tbody></table>
          </div>
          <p className="mb-1 mt-3 text-xs font-extrabold text-muted-foreground">سجل الأنشطة</p>
          <div className="space-y-1">{viewing.log.map((l, i) => <p key={i} className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {l}</p>)}</div>
        </>}
      </Modal>
      <ConfirmDialog open={!!cancelling} onOpenChange={v => { if (!v) setCancelling(null) }} destructive title="إلغاء الطلب" loading={cancel.isPending}
        description={'هل أنت متأكد من رغبتك في إلغاء الطلب: ' + (cancelling ?? '') + '؟'}
        confirmLabel="إلغاء الطلب" onConfirm={() => cancel.mutate(cancelling!)} />
    </div>
  )
}

