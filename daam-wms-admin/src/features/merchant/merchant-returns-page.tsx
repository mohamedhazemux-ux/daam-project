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
import { ActionButtons, AttachmentViewer, ConfirmDialog, FileUploadWithPreview, Modal, StatusBadge, selectCls } from '@/components/common'
import { merchantReturnsService, RETURN_REASONS, RETURN_CONDITIONS, type MerchantReturn, type ReturnItem } from '@/services/merchant-returns.service'
import { useAuthStore } from '@/store/auth-store'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { downloadCSV, arDate } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Eye, Plus, Search, Trash2, XCircle } from 'lucide-react'
export default function MerchantReturnsPage() {
  const t = useT()
  const navigate = useNavigate()
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
  const [form, setForm] = useState({ type: '', refundMethod: '', notes: '', attachments: [] as string[] })
  const [fErr, setFErr] = useState('')
  const [viewing, setViewing] = useState<MerchantReturn | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const { data: delivered } = useQuery({ queryKey: ['m-delivered', user?.store], queryFn: () => merchantReturnsService.deliveredOrders(user!.store!) })
  const order = (delivered ?? []).find(o => o.ref === orderRef)
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
  const create = useMutation({
    mutationFn: () => merchantReturnsService.create(user!.store!, user!.email, { orderRef, cust: order?.cust ?? '', phone: '0512345678', deliveredAt: order?.date ?? '', items, type: form.type, refundMethod: form.refundMethod, notes: form.notes, attachments: form.attachments }),
    onSuccess: () => { toast.success(t('تم إرسال طلب الإرجاع بنجاح')); invalidate(); setCreateOpen(false) },
  })
  const cancel = useMutation({ mutationFn: (ref: string) => merchantReturnsService.cancel(ref), onSuccess: (_, ref) => { toast.success(t('تم إلغاء طلب الإرجاع بنجاح') + ' ' + ref); invalidate(); setCancelling(null); setViewing(null) }, onError: e => toast.error((e as Error).message) })
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
    if (cur.length + arr.length > 5) { setFErr(t('الحد الأقصى 5 صور')); return }
    for (const f of arr) {
      if (!/\.(jpg|png|jpeg)$/i.test(f.name)) { setFErr(t('امتداد غير صالح، يرجى رفع صورة بصيغة JPG أو PNG أو JPEG')); return }
      if (f.size > 5 * 1024 * 1024) { setFErr(t('الحجم الأقصى للصورة 5 ميجابايت، يرجى استخدام صورة أخرى')); return }
    }
    setFErr('')
    setItems(s => s.map((x, j) => j === i ? { ...x, images: [...x.images, ...arr.map(f => f.name)] } : x))
  }
  const submit = () => {
    if (!orderRef) { setFErr(t('الطلب الأصلي مطلوب')); return }
    if (items.length === 0) { setFErr(t('مطلوب صنف مرتجع واحد على الأقل')); return }
    for (const it of items) {
      if (!it.name) { setFErr(t('المنتج مطلوب')); return }
      const ordered = order?.items.find(x => x.name === it.name)?.qty ?? 0
      if (!it.qty) { setFErr(t('الكمية المرتجعة مطلوبة')); return }
      if (it.qty < 1) { setFErr(t('يجب أن تكون الكمية المرتجعة 1 على الأقل')); return }
      if (it.qty > ordered) { setFErr(t('يجب أن تكون الكمية المرتجعة أقل من أو تساوي الكمية المطلوبة أصلًا')); return }
      if (!it.reason) { setFErr(t('سبب الإرجاع مطلوب')); return }
      if (!it.condition) { setFErr(t('حالة الصنف المرتجع مطلوبة')); return }
    }
    if (!form.type) { setFErr(t('نوع الإرجاع مطلوب')); return }
    if (allowed.size > 0 && !allowed.has(form.type)) { setFErr(t('نوع الإرجاع غير متوافق مع حالات الأصناف المحددة')); return }
    if (!form.refundMethod) { setFErr(t('طريقة الاسترداد المفضلة مطلوبة')); return }
    if (form.notes.length > 500) { setFErr(t('يجب أن تكون ملاحظات الإرجاع أقل من 500 حرف')); return }
    setFErr('')
    create.mutate()
  }
  const columns: ColumnDef<MerchantReturn, unknown>[] = [
    { accessorKey: 'ref', header: t('مرجع الإرجاع'), cell: ({ row }) => <b>{row.original.ref}</b> },
    { accessorKey: 'order', header: t('الطلب الأصلي') },
    { accessorKey: 'cust', header: t('العميل'), cell: ({ row }) => t(row.original.cust) },
    { accessorKey: 'totalItems', header: t('إجمالي الأصناف المرتجعة') },
    { accessorKey: 'type', header: t('نوع الإرجاع'), cell: ({ row }) => t(row.original.type) },
    { id: 'status', header: t('حالة الإرجاع'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { accessorKey: 'createdAt', header: t('تاريخ الإنشاء'), cell: ({ row }) => arDate(row.original.createdAt) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض تفاصيل الإرجاع'), onClick: () => navigate('/merchant/records/return/' + row.original.ref) },
        { icon: XCircle, label: t('إلغاء طلب الإرجاع'), variant: 'destructive', onClick: () => setCancelling(row.original.ref), hidden: row.original.status !== 'معلق' },
      ]} />) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بالمرجع أو الطلب أو العميل...')} className="pe-9" aria-label={t('بحث بالمرجع أو الطلب أو العميل...')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['معلق', 'معتمد', 'مرفوض', 'في الطريق', 'مستلم', 'تم الفحص', 'تم الاسترداد', 'ملغي'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label={t('تصفية حسب النوع')}>
              <option value="">{t('كل الأنواع')}</option>
              {['إرجاع للمخزون', 'إرجاع للتاجر', 'إتلاف'].map(tOpt => <option key={tOpt} value={tOpt}>{t(tOpt)}</option>)}
            </select>
            <Input type="date" className="w-36" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} aria-label={t('من تاريخ')} />
            <Input type="date" className="w-36" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} aria-label={t('إلى تاريخ')} />
            <Button variant="outline" size="sm" onClick={() => { setStatus(''); setType(''); setFrom(''); setTo(''); setPage(1) }}>{t('إعادة التعيين')}</Button>
            <div className="ms-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { downloadCSV('my-returns', ['المرجع', 'الطلب الأصلي', 'العميل', 'الأصناف', 'النوع', 'الحالة', 'طريقة الاسترداد', 'التاريخ'], (data?.rows ?? []).map(r => [r.ref, r.order, r.cust, r.totalItems, r.type, r.status, r.refundMethod, r.createdAt])); toast.success(t('تم تصدير طلبات الإرجاع بنجاح')) }}>{t('تصدير')}</Button>
              <Button size="sm" onClick={() => { setOrderRef(''); setItems([]); setForm({ type: '', refundMethod: '', notes: '', attachments: [] }); setFErr(''); setCreateOpen(true) }}><Plus className="size-4" /> {t('إنشاء طلب إرجاع')}</Button>
            </div>
          </div>
        } />
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} wide title={t('إنشاء طلب إرجاع')}
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>{t('إلغاء')}</Button><Button disabled={create.isPending} onClick={submit}>{t('إرسال طلب الإرجاع')}</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>{t('الطلب الأصلي (الطلبات المسلّمة فقط)')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={orderRef} onChange={e => { setOrderRef(e.target.value); setItems([]) }}>
              <option value="">{t('اختر الطلب...')}</option>
              {(delivered ?? []).map(o => <option key={o.ref} value={o.ref}>{o.ref} — {o.cust}</option>)}
            </select></div>
          {order && <>
            {([[t('مرجع الطلب'), order.ref], [t('اسم العميل'), order.cust], [t('رقم جوال العميل'), '0512345678'], [t('تاريخ التسليم'), order.date]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
          </>}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-extrabold">{t('الأصناف المرتجعة')} <span className="text-destructive">*</span></p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-lg border bg-muted/40 p-2 md:grid-cols-2">
                <select className={selectCls} value={it.name} onChange={e => setItems(s => s.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} aria-label={t('المنتج')}>
                  <option value="">{t('اختر المنتج...')}</option>
                  {(order?.items ?? []).map(p => <option key={p.name} value={p.name}>{p.name} ({t('طلب')}: {p.qty})</option>)}
                </select>
                <Input type="number" min={1} value={it.qty || ''} onChange={e => setItems(s => s.map((x, j) => j === i ? { ...x, qty: +e.target.value } : x))} aria-label={t('الكمية المرتجعة')} />
                <select className={selectCls} value={it.reason} onChange={e => setItems(s => s.map((x, j) => j === i ? { ...x, reason: e.target.value } : x))} aria-label={t('سبب الإرجاع')}>
                  <option value="">{t('سبب الإرجاع...')}</option>
                  {RETURN_REASONS.map(r => <option key={r} value={r}>{t(r)}</option>)}
                </select>
                <select className={selectCls} value={it.condition} onChange={e => setItems(s => s.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))} aria-label={t('حالة الصنف')}>
                  <option value="">{t('حالة الصنف المرتجع...')}</option>
                  {RETURN_CONDITIONS.map(c => <option key={c} value={c}>{t(c)}</option>)}
                </select>
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">{t('صور الصنف المرتجع')}</span>
                    <Button variant="outline" size="sm" className="text-destructive h-7 text-xs" onClick={() => setItems(s => s.filter((_, j) => j !== i))}><Trash2 className="size-3.5 me-1" /> {t('حذف الصنف')}</Button>
                  </div>
                  <FileUploadWithPreview
                    files={it.images}
                    accept=".jpg,.png,.jpeg,.webp"
                    maxFiles={5}
                    onChange={imgs => setItems(s => s.map((x, j) => j === i ? { ...x, images: imgs } : x))}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setItems(s => [...s, { name: '', qty: 1, reason: '', condition: '', images: [], ref: 'PRD-00' + (s.length + 1) }])}>{t('إضافة صنف مرتجع')}</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div><Label>{t('نوع الإرجاع')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="">{t('اختر النوع...')}</option>
              {['إرجاع للمخزون', 'إرجاع للتاجر', 'إتلاف'].filter(tOpt => allowed.size === 0 || allowed.has(tOpt)).map(tOpt => <option key={tOpt} value={tOpt}>{t(tOpt)}</option>)}
            </select>
            {allowed.size > 0 && <p className="mt-1 text-[11px] font-bold text-muted-foreground">{t('الأنواع المتاحة مفلترة حسب حالات الأصناف المحددة')}</p>}</div>
          <div><Label>{t('طريقة الاسترداد المفضلة')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.refundMethod} onChange={e => setForm(f => ({ ...f, refundMethod: e.target.value }))}>
              <option value="">{t('اختر...')}</option>
              <option value="رصيد المحفظة">{t('رصيد المحفظة')}</option>
              <option value="تحويل بنكي">{t('تحويل بنكي')}</option>
            </select></div>
          <div className="md:col-span-2"><Label>{t('ملاحظات الإرجاع (اختياري — 500 حرف)')}</Label><Textarea maxLength={500} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="md:col-span-2">
            <Label className="mb-1 block">{t('المرفقات الإضافية (اختياري — بوليصة، صور، فواتير)')}</Label>
            <FileUploadWithPreview
              files={form.attachments}
              accept=".jpg,.png,.jpeg,.pdf,.webp"
              maxFiles={5}
              onChange={atts => setForm(f => ({ ...f, attachments: atts }))}
            />
          </div>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={t('تفاصيل طلب الإرجاع') + ' — ' + (viewing?.ref ?? '')}
        footer={<>
          {viewing?.status === 'معلق' && <Button variant="destructive" onClick={() => setCancelling(viewing.ref)}>{t('إلغاء الطلب')}</Button>}
        </>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            {([[t('الطلب الأصلي'), viewing.order], [t('العميل'), viewing.cust], [t('رقم الجوال'), viewing.phone], [t('إجمالي الأصناف'), String(viewing.totalItems)], [t('نوع الإرجاع'), t(viewing.type)], [t('طريقة الاسترداد'), t(viewing.refundMethod)], [t('الحالة'), t(viewing.status)], [t('تاريخ الإنشاء'), viewing.createdAt]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('المنتج')}</th><th className="p-2 text-start font-extrabold">{t('المرجع')}</th><th className="p-2 text-start font-extrabold">{t('الكمية')}</th><th className="p-2 text-start font-extrabold">{t('السبب')}</th><th className="p-2 text-start font-extrabold">{t('الحالة')}</th><th className="p-2 text-start font-extrabold">{t('الصور')}</th></tr></thead>
              <tbody>{viewing.items.map((i, idx) => (
                <tr key={idx} className="border-b"><td className="p-2 font-bold">{t(i.name)}</td><td className="p-2"><span dir="ltr">{i.ref}</span></td><td className="p-2">{i.qty}</td><td className="p-2">{t(i.reason)}</td><td className="p-2">{t(i.condition)}</td><td className="p-2"><AttachmentViewer files={i.images} /></td></tr>))}
              </tbody></table>
          </div>
          <p className="mb-1 mt-3 text-xs font-extrabold text-muted-foreground">{t('ملاحظات الإرجاع')}</p>
          <p className="mb-3 rounded-lg border bg-muted/40 p-3 text-[13px] font-bold">{viewing.notes || '—'}</p>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('المرفقات')}</p>
          <div className="mb-3"><AttachmentViewer files={viewing.attachments ?? []} /></div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('الخط الزمني للحالات')}</p>
          <div className="space-y-1">{viewing.timeline.map((tl, i) => <p key={i} className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {t(tl)}</p>)}</div>
        </>}
      </Modal>
      <ConfirmDialog open={!!cancelling} onOpenChange={v => { if (!v) setCancelling(null) }} destructive title={t('إلغاء طلب الإرجاع')} loading={cancel.isPending}
        description={t('هل أنت متأكد من رغبتك في إلغاء طلب الإرجاع؟') + ' ' + (cancelling ?? '')}
        confirmLabel={t('إلغاء الطلب')} onConfirm={() => cancel.mutate(cancelling!)} />
    </div>
  )
}
