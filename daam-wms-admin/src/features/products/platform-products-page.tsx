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
import { productsService } from '@/services/products.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { PlatformProduct } from '@/types'
import { Plus, Search } from 'lucide-react'
export default function PlatformProductsPage() {
  const qc = useQueryClient()
  const t = useT()
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, page, pageSize: 10 }), [dq, status, page])
  const { data, isLoading } = useQuery({ queryKey: ['platform-products', qp], queryFn: () => productsService.list(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['platform-products'] })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformProduct | null>(null)
  const [form, setForm] = useState({ name: '', desc: '', status: 'نشط' as 'نشط' | 'غير نشط' })
  const [fErr, setFErr] = useState('')
  const [deleting, setDeleting] = useState<PlatformProduct | null>(null)
  // @ts-expect-error The two branches intentionally return different API payloads; the UI only needs completion.
  const save = useMutation({ mutationFn: () => editing ? productsService.update(editing.ref, form) : productsService.create(form), onSuccess: ref => { toast.success(editing ? 'تم تحديث بيانات منتج المنصة بنجاح' : 'تم إنشاء منتج المنصة بنجاح — المرجع: ' + ref); invalidate(); setOpen(false) }, onError: e => toast.error((e as Error).message) })
  const toggle = useMutation({ mutationFn: (ref: string) => productsService.toggle(ref), onSuccess: m => { toast.success(m); invalidate() } })
  const remove = useMutation({ mutationFn: (ref: string) => productsService.remove(ref), onSuccess: () => { toast.success('تم حذف منتج المنصة بنجاح'); invalidate(); setDeleting(null) }, onError: e => toast.error((e as Error).message) })
  const submit = () => {
    if (form.name.length < 3 || form.name.length > 100) { setFErr('يجب أن يكون اسم المنتج بين 3 و 100 حرف'); return }
    if (form.desc.length > 1000) { setFErr('يجب أن يكون وصف المنتج أقل من 1000 حرف'); return }
    setFErr('')
    save.mutate()
  }
  const columns: ColumnDef<PlatformProduct, unknown>[] = [
    { accessorKey: 'ref', header: t('المرجع'), cell: ({ row }) => <span className="rounded-md bg-foreground px-2 py-0.5 text-[11px] font-extrabold text-background">{row.original.ref}</span> },
    { id: 'name', header: t('اسم المنتج'), cell: ({ row }) => <span className="font-bold">{row.original.name} <span className="ms-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10.5px] font-extrabold text-violet-700">{t('منصة')}</span></span> },
    { accessorKey: 'desc', header: t('الوصف'), cell: ({ row }) => <span className="block max-w-[300px] truncate">{row.original.desc}</span> },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'created', header: t('تاريخ الإنشاء'), cell: ({ row }) => arDate(row.original.created) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => { setEditing(row.original); setForm({ name: row.original.name, desc: row.original.desc, status: row.original.status }); setFErr(''); setOpen(true) }}>{t('تعديل')}</Button>
        <Button size="sm" variant="outline" onClick={() => toggle.mutate(row.original.ref)}>{row.original.status === 'نشط' ? t('تعطيل') : t('تفعيل')}</Button>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleting(row.original)}>{t('حذف')}</Button>
      </div>) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/40 p-3 text-xs font-semibold text-muted-foreground">
        <b>{t('منتجات المنصة (CR-002)')}:</b> {t('منتجات رئيسية غير مخزّنة متاحة لجميع التجار دون تتبع مخزون. المرجع PLT-00X يُولّد تلقائيًا ولا يمكن تعديله.')}
      </div>
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.ref}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث في منتجات المنصة...')} className="pe-9" aria-label={t('بحث في منتجات المنصة')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              <option value="نشط">{t('نشط')}</option>
              <option value="غير نشط">{t('غير نشط')}</option>
            </select>
            <Button size="sm" className="ms-auto" onClick={() => { setEditing(null); setForm({ name: '', desc: '', status: 'نشط' }); setFErr(''); setOpen(true) }}><Plus className="size-4" /> {t('إنشاء منتج منصة')}</Button>
          </div>
        } />
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('تعديل منتج منصة — ') + editing.ref : t('إنشاء منتج منصة جديد')}
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('إلغاء')}</Button>
          <Button disabled={save.isPending} onClick={submit}>{t('حفظ')}</Button>
        </>}>
        <div className="grid gap-3">
          {editing && <p className="text-xs font-bold text-muted-foreground">المرجع الداخلي: <b dir="ltr">{editing.ref}</b> (غير قابل للتعديل)</p>}
          <div><Label>اسم المنتج (3 – 100 حرف) <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>وصف المنتج (اختياري — 1000 حرف)</Label><Textarea value={form.desc} maxLength={1000} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /></div>
          <div><Label>صورة المنتج (اختياري — JPG/PNG/JPEG حتى 5MB)</Label><Input type="file" accept=".jpg,.png,.jpeg" /></div>
          <div><Label>حالة المنتج <span className="text-destructive">*</span></Label>
            <div className="flex gap-5 pt-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.status === 'نشط'} onChange={() => setForm(f => ({ ...f, status: 'نشط' }))} /> نشط</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.status === 'غير نشط'} onChange={() => setForm(f => ({ ...f, status: 'غير نشط' }))} /> غير نشط</label>
            </div></div>
        </div>
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
      <ConfirmDialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null) }} destructive title="حذف منتج المنصة" loading={remove.isPending}
        description={<>هل أنت متأكد من حذف منتج المنصة <b>{deleting?.name}</b>؟{deleting?.linked && <span className="mt-1 block font-bold text-warning">⚠ تحذير: المنتج مرتبط ببعض الطلبات النشطة.</span>}<span className="mt-1 block text-xs">تُحفظ بيانات المنتج في سجلات الحذف لإمكانية الاستعادة.</span></>}
        confirmLabel="حذف" onConfirm={() => remove.mutate(deleting!.ref)} />
    </div>
  )
}
