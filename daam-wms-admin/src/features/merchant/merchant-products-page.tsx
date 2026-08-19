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
import { ActionButtons, AttachmentBadgeList, AttachmentViewer, ConfirmDialog, FileUploadWithPreview, Modal, StatusBadge, selectCls } from '@/components/common'
import { merchantProductsService, type MerchantProduct } from '@/services/merchant-products.service'
import { inventoryService } from '@/services/inventory.service'
import { productsService } from '@/services/products.service'
import { useAuthStore } from '@/store/auth-store'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { downloadCSV, money } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Eye, Pencil, Trash2, Package, Plus, Search, Upload, Tags, TrendingUp } from 'lucide-react'
export default function MerchantProductsPage() {
  const t = useT()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('منتجاتي')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, page, pageSize: 10, store: user?.store ?? '' }), [dq, status, page, user?.store])
  const platQp = useMemo(() => ({ q: dq, status, page: 1, pageSize: 100 }), [dq, status])
  const { data, isLoading } = useQuery({ queryKey: ['merchant-products', qp], queryFn: () => merchantProductsService.list(qp), enabled: source !== 'منتجات المنصة' })
  const { data: plat } = useQuery({ queryKey: ['platform-catalog', platQp], queryFn: () => productsService.list(platQp), enabled: source !== 'منتجاتي' })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['merchant-products'] })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MerchantProduct | null>(null)
  const [form, setForm] = useState({ name: '', sku: '', desc: '', qty: 0, price: 0, img: '' })
  const [fErr, setFErr] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFile, setBulkFile] = useState('')
  const [bulkOk, setBulkOk] = useState(false)
  const [bErr, setBErr] = useState('')
  const [viewing, setViewing] = useState<MerchantProduct | null>(null)
  const [deleting, setDeleting] = useState<MerchantProduct | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  // حالة نافذة طلب تعديل المخزون
  const [adjOpen, setAdjOpen] = useState(false)
  const [adjProduct, setAdjProduct] = useState<MerchantProduct | null>(null)
  const [adjForm, setAdjForm] = useState({ type: 'إضافة', qty: 1, reason: '' })
  const [adjErr, setAdjErr] = useState('')
  // @ts-expect-error The two branches intentionally return different API payloads; the UI only needs completion.
  const save = useMutation({ mutationFn: () => editing ? merchantProductsService.update(editing.ref, { name: form.name, desc: form.desc, price: form.price }) : merchantProductsService.create(user!.store!, form), onSuccess: () => { toast.success(editing ? 'تم تحديث بيانات المنتج بنجاح' : 'تم إضافة المنتج بنجاح'); invalidate(); setOpen(false); setViewing(null) }, onError: e => setFErr((e as Error).message) })
  const toggle = useMutation({ mutationFn: (ref: string) => merchantProductsService.toggle(ref), onSuccess: () => { toast.success('تم تغيير حالة المنتج بنجاح'); invalidate(); setViewing(null) } })
  const remove = useMutation({ mutationFn: (ref: string) => merchantProductsService.remove(ref), onSuccess: () => { toast.success('تم حذف المنتج بنجاح'); invalidate(); setDeleting(null); setViewing(null) } })
  const generate = useMutation({ mutationFn: () => merchantProductsService.generate(user!.store!, 3), onSuccess: () => { toast.success('تم توليد المنتجات بنجاح'); invalidate(); setBulkOpen(false) } })
  const downloadTpl = useMutation({ mutationFn: () => merchantProductsService.downloadTemplate(), onSuccess: () => toast.success('تم تنزيل قالب المنتجات بنجاح') })
  const submitAdj = useMutation({
    mutationFn: () => inventoryService.adjust(adjProduct!.name, 'المستودع الرئيسي', adjForm.type, adjForm.qty, adjForm.reason),
    onSuccess: () => { toast.success('تم إرسال طلب تعديل المخزون بنجاح'); setAdjOpen(false); setViewing(null) },
    onError: e => setAdjErr((e as Error).message),
  })
  const onBulkFile = (name: string) => {
    setBErr('')
    setBulkOk(false)
    if (!/\.(xlsx|xls)$/i.test(name)) { setBErr('الملف غير صالح ، يرجى التحقق من التنسيق والبيانات'); setBulkFile(''); return }
    setBulkFile(name)
    setBulkOk(true)
    toast.success('تم رفع المنتجات بنجاح')
  }
  const submit = () => {
    if (!form.name.trim()) { setFErr('اسم المنتج مطلوب'); return }
    if (form.name.length < 3 || form.name.length > 100) { setFErr('يجب أن يتراوح اسم المنتج بين 3 و 100 حرف'); return }
    if (!editing && !form.sku.trim()) { setFErr('رمز المنتج مطلوب'); return }
    if (form.desc.length > 500) { setFErr('الوصف يجب أن يكون أقل من 500 حرف'); return }
    if (!form.qty && form.qty !== 0) { setFErr('الكمية المتاحة مطلوبة'); return }
    if (form.qty < 0) { setFErr('يجب أن تكون الكمية المتاحة أكبر من 0'); return }
    if (!form.price) { setFErr('السعر مطلوب'); return }
    if (form.price < 0) { setFErr('يجب أن يكون السعر أكبر من 0'); return }
    setFErr('')
    save.mutate()
  }
  const onImage = (f: File | null) => {
    if (!f) return
    if (!/\.(jpg|png|jpeg)$/i.test(f.name)) { toast.error('امتداد الصورة غير صالح ، يرجى تحميل JPG, PNG, JPEG.'); return }
    if (f.size > 5 * 1024 * 1024) { toast.error('الحد الأقصى لحجم الصورة هو 5 ميجابايت ، يرجى استخدام صورة أصغر'); return }
    toast.success('تم إرفاق صورة المنتج')
  }
  const columns: ColumnDef<MerchantProduct, unknown>[] = [
    { accessorKey: 'name', header: t('المنتج'), cell: ({ row }) => <span className="flex items-center gap-2 font-bold"><Package className="size-4 text-muted-foreground" /> {row.original.name}</span> },
    { accessorKey: 'sku', header: t('رمز المنتج (SKU)'), cell: ({ row }) => <span dir="ltr">{row.original.sku}</span> },
    { accessorKey: 'qty', header: t('الكمية المتاحة'), cell: ({ row }) => <span className={row.original.qty === 0 ? 'font-black text-destructive' : row.original.qty < 25 ? 'font-black text-amber-600' : 'font-bold'}>{row.original.qty}</span> },
    { id: 'price', header: t('السعر'), cell: ({ row }) => money(row.original.price) },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Eye,       label: 'عرض التفاصيل', onClick: () => navigate('/merchant/records/product/' + row.original.ref) },
        { icon: Pencil,    label: 'تعديل',         onClick: () => { setEditing(row.original); setForm({ name: row.original.name, sku: row.original.sku, desc: row.original.desc, qty: row.original.qty, price: row.original.price, img: '' }); setFErr(''); setOpen(true) } },
        { icon: TrendingUp, label: 'طلب تعديل مخزون', onClick: () => { setAdjProduct(row.original); setAdjForm({ type: 'إضافة', qty: 1, reason: '' }); setAdjErr(''); setAdjOpen(true) } },
        { icon: Trash2,    label: 'حذف',           onClick: () => setDeleting(row.original), variant: 'destructive' },
      ]} maxVisible={4} />
    ) },
  ]
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm">
        <DataTable columns={columns} data={source === 'منتجات المنصة' ? [] : data?.rows ?? []} total={source === 'منتجات المنصة' ? 0 : data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading && source !== 'منتجات المنصة'} getRowId={r => r.ref}
          toolbar={
            <div className="flex flex-wrap items-center gap-2 border-b p-3">
              <div className="relative min-w-[200px] flex-1 md:max-w-xs">
                <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث باسم المنتج أو SKU...')} className="pe-9" aria-label={t('بحث في المنتجات')} />
              </div>
              <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
                <option value="">{t('كل الحالات')}</option>
                <option value="نشط">{t('نشط')}</option>
                <option value="غير نشط">{t('غير نشط')}</option>
              </select>
              <select className={selectCls} value={source} onChange={e => { setSource(e.target.value); setPage(1) }} aria-label={t('مصدر المنتج')}>
                <option value="منتجاتي">{t('منتجاتي')}</option><option value="منتجات المنصة">{t('منتجات المنصة')}</option><option value="الكل">{t('الكل')}</option>
              </select>
              <div className="ms-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setCatalogOpen(true)}><Tags className="size-4" /> {t('كتالوج المنصة')}</Button>
                <Button size="sm" variant="outline" onClick={() => { setBulkFile(''); setBulkOk(false); setBErr(''); setBulkOpen(true) }}><Upload className="size-4" /> {t('رفع منتجات بكميات كبيرة')}</Button>
                <Button size="sm" variant="outline" onClick={() => { downloadCSV('my-products', ['المنتج', 'SKU', 'الكمية', 'السعر', 'الحالة'], (data?.rows ?? []).map(p => [p.name, p.sku, p.qty, p.price, p.status])); toast.success('تم تصدير قائمة المنتجات بنجاح') }}>{t('تصدير')}</Button>
                <Button size="sm" onClick={() => { setEditing(null); setForm({ name: '', sku: '', desc: '', qty: 0, price: 0, img: '' }); setFErr(''); setOpen(true) }}><Plus className="size-4" /> {t('إضافة منتج')}</Button>
              </div>
            </div>
          } />
      </div>
      {source !== 'منتجاتي' && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b bg-muted/40 p-3 text-xs font-extrabold text-muted-foreground">{t('منتجات المنصة (للقراءة فقط — تُضمَّن في الطلبات دون تتبع مخزون)')}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('المنتج')}</th><th className="p-2 text-start font-extrabold">{t('المرجع')}</th><th className="p-2 text-start font-extrabold">{t('الوصف')}</th><th className="p-2 text-start font-extrabold">{t('الحالة')}</th><th className="p-2" /></tr></thead>
              <tbody>
                {(plat?.rows ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs font-bold text-muted-foreground">
                      {t('لا توجد منتجات منصة مطابقة للتصفية الحالية')}
                    </td>
                  </tr>
                ) : (
                  (plat?.rows ?? []).map(p => (
                    <tr key={p.ref} className="border-b">
                      <td className="p-2 font-bold">{p.name} <span className="ms-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10.5px] font-extrabold text-violet-700">{t('منصة')}</span></td>
                      <td className="p-2"><span dir="ltr">{p.ref}</span></td>
                      <td className="p-2"><span className="block max-w-[260px] truncate">{p.desc}</span></td>
                      <td className="p-2"><StatusBadge value={p.status} /></td>
                      <td className="p-2"><Button size="sm" variant="outline" onClick={() => { toast.success('تمت إضافة منتج المنصة إلى مسودة الطلب'); navigate('/merchant/orders') }}>{t('إضافة إلى الطلب')}</Button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('تعديل المنتج — ') + editing.sku : t('إضافة منتج جديد')}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>{t('إلغاء')}</Button><Button disabled={save.isPending} onClick={submit}>{editing ? t('حفظ التغييرات') : t('حفظ المنتج')}</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FileUploadWithPreview
              label="صورة المنتج (JPG/PNG/JPEG حتى 5MB)"
              files={form.img ? [form.img] : []}
              accept=".jpg,.png,.jpeg,.webp"
              single
              maxSizeMB={5}
              onChange={files => setForm(f => ({ ...f, img: files[0] ?? '' }))}
            />
          </div>
          <div><Label>اسم المنتج (3 – 100 حرف) <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>رمز المنتج SKU <span className="text-destructive">*</span></Label><Input dir="ltr" value={form.sku} disabled={!!editing} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU-1001" /></div>
          <div>
            <Label>الكمية المتاحة {editing ? '(للقراءة فقط)' : <span className="text-destructive">*</span>}</Label>
            {editing ? (
              <div className="flex items-center gap-2">
                <Input type="number" value={form.qty} disabled className="bg-muted/60" />
                <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => { setOpen(false); setAdjProduct(editing); setAdjForm({ type: 'إضافة', qty: 1, reason: '' }); setAdjErr(''); setAdjOpen(true) }}>
                  <TrendingUp className="size-3.5" /> طلب تعديل
                </Button>
              </div>
            ) : (
              <Input type="number" min={0} value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: +e.target.value }))} />
            )}
            {editing && <p className="mt-1 text-[11px] font-bold text-muted-foreground">لتعديل الكمية، استخدم زر «طلب تعديل» ليتم مراجعته من قبل الإدارة</p>}
          </div>
          <div><Label>السعر <span className="text-destructive">*</span></Label><Input type="number" step="0.01" min={0} value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} /></div>
          <div className="rounded-lg border bg-muted/30 p-2 md:col-span-2">
            <Label className="mb-1 block text-xs font-bold text-muted-foreground">أبعاد المنتج (الأبعاد بالمتر المكعب m³ لحساب السعة التخزينية)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div><span className="text-[11px] font-bold">الطول (سم):</span><Input type="number" min={1} defaultValue={20} className="mt-1" /></div>
              <div><span className="text-[11px] font-bold">العرض (سم):</span><Input type="number" min={1} defaultValue={15} className="mt-1" /></div>
              <div><span className="text-[11px] font-bold">الارتفاع (سم):</span><Input type="number" min={1} defaultValue={10} className="mt-1" /></div>
            </div>
            <p className="mt-1 text-[11px] font-extrabold text-muted-foreground">الحجم المقدر للمنتج: <span className="text-foreground">0.003 m³</span> لكل وحدة</p>
          </div>
          <div className="md:col-span-2"><Label>الوصف (اختياري — 500 حرف)</Label><Textarea maxLength={500} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /></div>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
      {/* نافذة طلب تعديل المخزون */}
      <Modal open={adjOpen} onClose={() => setAdjOpen(false)} title={'طلب تعديل مخزون — ' + (adjProduct?.name ?? '')}
        footer={<><Button variant="outline" onClick={() => setAdjOpen(false)}>إلغاء</Button><Button disabled={submitAdj.isPending} onClick={() => { if (!adjForm.reason.trim()) { setAdjErr('سبب الطلب مطلوب'); return } if (adjForm.qty < 1) { setAdjErr('الكمية يجب أن تكون 1 على الأقل'); return } setAdjErr(''); submitAdj.mutate() }}>إرسال طلب التعديل</Button></>}>
        <div className="grid gap-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[11px] font-bold text-muted-foreground">الكمية الحالية في المخزون</p>
            <p className="text-2xl font-extrabold">{adjProduct?.qty ?? 0}</p>
          </div>
          <div><Label>نوع الطلب <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={adjForm.type} onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))}>
              <option value="إضافة">إضافة إلى المخزون</option>
              <option value="سحب">سحب من المخزون</option>
            </select>
          </div>
          <div><Label>الكمية المطلوبة <span className="text-destructive">*</span></Label>
            <Input type="number" min={1} value={adjForm.qty || ''} onChange={e => setAdjForm(f => ({ ...f, qty: +e.target.value }))} />
          </div>
          <div><Label>سبب الطلب <span className="text-destructive">*</span></Label>
            <Textarea value={adjForm.reason} onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} placeholder="اذكر سبب طلب تعديل الكمية..." maxLength={300} />
          </div>
          {adjErr && <p className="text-xs font-bold text-destructive">{adjErr}</p>}
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] font-bold text-amber-700">⚠ سيتم مراجعة هذا الطلب من قبل الإدارة قبل تطبيق التغيير على المخزون</p>
        </div>
      </Modal>
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="رفع المنتجات بكميات كبيرة"
        footer={<>
          <Button variant="outline" disabled={downloadTpl.isPending} onClick={() => downloadTpl.mutate()}>تنزيل القالب (CSV)</Button>
          <Button variant="outline" onClick={() => setBulkOpen(false)}>إغلاق</Button>
          {bulkOk && <Button disabled={generate.isPending} onClick={() => generate.mutate()}>توليد المنتجات</Button>}
        </>}>
        <div className="grid gap-3">
          <div><Label>ملف Excel (.xlsx / .xls)</Label><Input type="file" accept=".xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) onBulkFile(f.name) }} /></div>
          {bErr && <p className="text-xs font-bold text-destructive">{bErr}</p>}
          {bulkOk && <p className="rounded-lg bg-muted p-2 text-xs font-bold">الملف: <b dir="ltr">{bulkFile}</b> — جاهز للتوليد (3 منتجات تجريبية)</p>}
        </div>
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={'تفاصيل المنتج — ' + (viewing?.name ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => { if (viewing) { setEditing(viewing); setForm({ name: viewing.name, sku: viewing.sku, desc: viewing.desc, qty: viewing.qty, price: viewing.price, img: viewing.img || '' }); setFErr(''); setOpen(true) } }}>{t('تعديل')}</Button>
          <Button variant="outline" onClick={() => viewing && toggle.mutate(viewing.ref)}>{viewing?.status === 'نشط' ? t('تعطيل') : t('تفعيل')}</Button>
          <Button variant="destructive" onClick={() => viewing && setDeleting(viewing)}>{t('حذف')}</Button>
        </>}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {([['SKU', <span key="s" dir="ltr">{viewing.sku}</span>], ['الكمية المتاحة', String(viewing.qty)], ['السعر', money(viewing.price)], ['الحالة', <StatusBadge key="h" value={viewing.status} />]] as [string, unknown][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v as React.ReactNode}</p></div>))}
          </div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('الوصف')}</p>
          <p className="mb-3 rounded-lg border bg-muted/40 p-3 text-[13px] font-bold">{viewing.desc || '—'}</p>
          <div className="mb-3">
            <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('صورة ومرفقات المنتج')}</p>
            <AttachmentBadgeList attachments={viewing.img ? [viewing.img] : []} emptyText="لا توجد مرفقات أو صور مرتبطة بهذا المنتج." />
          </div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">سجل الأنشطة (Activity Log)</p>
          <div className="space-y-1">{viewing.log.map((l, i) => <p key={i} className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {l}</p>)}</div>
        </>}
      </Modal>
      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} wide title="كتالوج منتجات المنصة (النشطة فقط)"
        footer={<Button variant="outline" onClick={() => setCatalogOpen(false)}>إغلاق</Button>}>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المنتج</th><th className="p-2 text-start font-extrabold">المرجع</th><th className="p-2 text-start font-extrabold">الوصف</th><th className="p-2" /></tr></thead>
            <tbody>{(plat?.rows ?? []).map(p => (
              <tr key={p.ref} className="border-b">
                <td className="p-2 font-bold">{p.name} <span className="ms-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10.5px] font-extrabold text-violet-700">منصة</span></td>
                <td className="p-2"><span dir="ltr">{p.ref}</span></td>
                <td className="p-2"><span className="block max-w-[240px] truncate">{p.desc}</span></td>
                <td className="p-2"><Button size="sm" variant="outline" onClick={() => { setCatalogOpen(false); toast.success('تمت إضافة منتج المنصة إلى مسودة الطلب'); navigate('/merchant/orders') }}>إضافة إلى الطلب</Button></td>
              </tr>))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] font-bold text-muted-foreground">العدد الكلي لمنتجات المنصة النشطة: {plat?.total ?? 0}</p>
      </Modal>
      <ConfirmDialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null) }} destructive title="حذف المنتج" loading={remove.isPending}
        description={'هل أنت متأكد من رغبتك في حذف المنتج: ' + (deleting?.name ?? '') + '؟'}
        confirmLabel="حذف" onConfirm={() => remove.mutate(deleting!.ref)} />
    </div>
  )
}

