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
import { ActionButtons, AttachmentBadgeList, ConfirmDialog, FileUploadWithPreview, Modal, StatusBadge, selectCls } from '@/components/common'
import { merchantServicesService, type ServiceRequestM } from '@/services/merchant-services.service'
import { useAuthStore } from '@/store/auth-store'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { downloadCSV, money, todayISO, arDate } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Eye, Plus, Search, XCircle } from 'lucide-react'

export function MerchantServiceRequestsPage() {
  return <MerchantServicesPage />
}


export default function MerchantServicesPage() {

  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [urgency, setUrgency] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, urgency, page, pageSize: 10, store: user?.store ?? '' }), [dq, status, urgency, page, user?.store])
  const { data, isLoading } = useQuery({ queryKey: ['m-srv', qp], queryFn: () => merchantServicesService.list(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['m-srv'] })
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ type: '', product: '', qty: 1, preferred: '', urgency: '', notes: '', attachments: [] as string[], consent: false })
  const [fErr, setFErr] = useState('')
  const [viewing, setViewing] = useState<ServiceRequestM | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const { data: types } = useQuery({ queryKey: ['m-srv-types'], queryFn: () => merchantServicesService.types() })
  const { data: prods } = useQuery({ queryKey: ['m-srv-prods', user?.store], queryFn: () => merchantServicesService.products(user!.store!) })
  const selType = (types ?? []).find(t => t.name === form.type)
  const create = useMutation({ mutationFn: () => merchantServicesService.create(user!.store!, form), onSuccess: () => { toast.success(t('تم إرسال طلب الخدمة بنجاح')); invalidate(); setCreateOpen(false) } })
  const cancel = useMutation({ mutationFn: (ref: string) => merchantServicesService.cancel(ref), onSuccess: (_, ref) => { toast.success(t('تم إلغاء طلب الخدمة بنجاح') + ' ' + ref); invalidate(); setCancelling(null); setViewing(null) }, onError: e => toast.error((e as Error).message) })
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
  const submit = () => {
    if (!form.type) { setFErr(t('نوع الخدمة مطلوب')); return }
    if (selType?.prod === 'نعم' && !form.product) { setFErr(t('المنتج المرتبط مطلوب')); return }
    if (!form.qty) { setFErr(t('الكمية المطلوبة مطلوبة')); return }
    if (form.qty < 1) { setFErr(t('يجب أن تكون الكمية المطلوبة 1 على الأقل')); return }
    if (form.qty > 10000) { setFErr(t('يجب أن تكون الكمية المطلوبة أقل من 10000')); return }
    if (form.preferred && form.preferred < todayISO()) { setFErr(t('يجب أن يكون التاريخ المفضل اليوم أو تاريخًا مستقبليًا')); return }
    if (!form.urgency) { setFErr(t('مستوى الإلحاح مطلوب')); return }
    if (form.notes.length > 500) { setFErr(t('يجب أن تكون ملاحظات طلب الخدمة أقل من 500 حرف')); return }
    if (selType?.model === 'متكرر' && !form.consent) { setFErr(t('يجب أن توافق على شروط الفوترة المتكررة للمتابعة')); return }
    setFErr('')
    create.mutate()
  }
  const columns = [
    { accessorKey: 'ref', header: t('مرجع الطلب'), cell: ({ row }: any) => <b>{row.original.ref}</b> },
    { accessorKey: 'type', header: t('نوع الخدمة'), cell: ({ row }: any) => t(row.original.type) },
    { accessorKey: 'product', header: t('المنتج المرتبط'), cell: ({ row }: any) => row.original.product ? t(row.original.product) : '—' },
    { accessorKey: 'qty', header: t('الكمية') },
    { id: 'est', header: t('التكلفة التقديرية'), cell: ({ row }: any) => money(row.original.estCost) },
    { id: 'urgency', header: t('الإلحاح'), cell: ({ row }: any) => <StatusBadge value={row.original.urgency} /> },
    { id: 'status', header: t('الحالة'), cell: ({ row }: any) => <StatusBadge value={row.original.status} /> },
    { accessorKey: 'preferred', header: t('التاريخ المفضل'), cell: ({ row }: any) => row.original.preferred ? arDate(row.original.preferred) : '—' },
    { accessorKey: 'createdAt', header: t('تاريخ الطلب'), cell: ({ row }: any) => row.original.createdAt ? arDate(row.original.createdAt) : '—' },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }: any) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض تفاصيل الطلب'), onClick: () => navigate('/merchant/records/service-request/' + row.original.ref) },
        { icon: XCircle, label: t('إلغاء طلب الخدمة'), variant: 'destructive', onClick: () => setCancelling(row.original.ref), hidden: row.original.status !== 'معلق' },
      ]} />) },
  ] as ColumnDef<any, unknown>[]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={(r: any) => r.ref}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث بالمرجع أو الخدمة أو المنتج...')} className="pe-9" aria-label={t('بحث في طلبات الخدمة')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {['معلق', 'معتمد', 'مرفوض', 'قيد التنفيذ', 'مكتمل', 'ملغي'].map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <select className={selectCls} value={urgency} onChange={e => { setUrgency(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الإلحاح')}>
              <option value="">{t('كل مستويات الإلحاح')}</option>
              {['عادي', 'عاجل', 'حرج'].map(u => <option key={u} value={u}>{t(u)}</option>)}
            </select>
            <div className="ms-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { downloadCSV('service-requests', ['المرجع', 'الخدمة', 'المنتج', 'الكمية', 'التكلفة التقديرية', 'الإلحاح', 'الحالة', 'التاريخ المفضل', 'تاريخ الطلب'], (data?.rows ?? []).map((x: any) => [x.ref, x.type, x.product ?? '', x.qty, x.estCost, x.urgency, x.status, x.preferred ?? '', x.createdAt])); toast.success(t('تم تصدير طلبات الخدمة بنجاح')) }}>{t('تصدير')}</Button>
              <Button size="sm" onClick={() => { setForm({ type: '', product: '', qty: 1, preferred: '', urgency: '', notes: '', attachments: [], consent: false }); setFErr(''); setCreateOpen(true) }}><Plus className="size-4" /> {t('إنشاء طلب خدمة')}</Button>
            </div>
          </div>
        } />
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} wide title={t('إنشاء طلب خدمة')}
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>{t('إلغاء')}</Button><Button disabled={create.isPending} onClick={submit}>{t('إرسال طلب الخدمة')}</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>{t('نوع الخدمة')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, product: '', consent: false }))}>
              <option value="">{t('اختر الخدمة...')}</option>
              {(types ?? []).map(tOpt => <option key={tOpt.name} value={tOpt.name}>{t(tOpt.name)}</option>)}
            </select></div>
          {selType?.prod === 'نعم' && <div><Label>{t('المنتج المرتبط')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}>
              <option value="">{t('اختر المنتج...')}</option>
              {(prods ?? []).map(p => <option key={p.ref} value={p.name}>{t(p.name)}</option>)}
            </select></div>}
          <div>
            <Label>{t('الكمية / المدة المطلوبة')} <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min={1}
              max={10000}
              placeholder={t('أدخل الكمية (الحد الأدنى 1)')}
              value={form.qty || ''}
              onChange={e => {
                const v = e.target.value === '' ? 0 : Number(e.target.value)
                setForm(f => ({ ...f, qty: v }))
                if (v <= 0) setFErr(t('يرجى إدخال كمية صحيحة تبدأ من 1 أو أكثر'))
                else if (v > 10000) setFErr(t('الحد الأقصى هو 10,000'))
                else setFErr('')
              }}
            />
            <p className="mt-1 text-[11px] font-bold text-muted-foreground">{t('الحد الأدنى')}: <b className="text-foreground">1</b> — {t('يمكنك كتابة الرقم مباشرة')}</p>
          </div>
          <div><Label>{t('التاريخ المفضل')} ({t('اختياري')})</Label><Input type="date" value={form.preferred} onChange={e => setForm(f => ({ ...f, preferred: e.target.value }))} /></div>
          <div><Label>{t('مستوى الإلحاح')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
              <option value="">{t('اختر...')}</option>
              {['عادي', 'عاجل', 'حرج'].map(u => <option key={u} value={u}>{t(u)}</option>)}
            </select></div>
          <div><Label>{t('الملاحظات (اختياري — 500 حرف)')}</Label><Textarea maxLength={500} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="md:col-span-2">
            <FileUploadWithPreview
              label={t('المرفقات والوثائق الداعمة (اختياري)')}
              files={form.attachments}
              accept=".jpg,.png,.jpeg,.pdf,.webp"
              maxFiles={5}
              onChange={atts => setForm(f => ({ ...f, attachments: atts }))}
            />
          </div>
        </div>
        {selType && (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {([[t('اسم الخدمة'), t(selType.name)], [t('التكلفة الأساسية'), money(selType.cost) + ' / ' + t(selType.unit)], [t('نموذج الدفع'), t(selType.model)], [t('التكرار'), selType.model === 'متكرر' ? t(selType.freq) : '—']] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
            <div className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{t('التكلفة التقديرية للدورة')}</p><p className="text-[13px] font-extrabold">{money(selType.cost * form.qty)}</p></div>
            {selType.model === 'متكرر' && <div className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{t('تاريخ الفوترة الأولى التقريبي')}</p><p className="text-[13px] font-extrabold">{arDate(merchantServicesService.firstBilling(selType.freq))}</p></div>}
          </div>
        )}
        {selType?.model === 'متكرر' && (
          <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
            <p className="text-xs font-bold text-violet-800">{t('سيتم فوترة هذه الخدمة بشكل دوري. سيتم معالجة الرسوم الأولى عند الموافقة.')}</p>
            <label className="mt-2 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.consent} onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))} /> {t('أوافق على شروط الفوترة المتكررة')}</label>
          </div>
        )}
        {fErr && <p className="mt-2 text-xs font-bold text-destructive">{fErr}</p>}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} wide title={t('تفاصيل طلب الخدمة') + ' — ' + (viewing?.ref ?? '')}
        footer={viewing?.status === 'معلق' ? <Button variant="destructive" onClick={() => setCancelling(viewing.ref)}>{t('إلغاء الطلب')}</Button> : undefined}>
        {viewing && <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {([[t('نوع الخدمة'), t(viewing.type)], [t('المنتج المرتبط'), viewing.product ? t(viewing.product) : '—'], [t('الكمية'), String(viewing.qty)], [t('التكلفة التقديرية'), money(viewing.estCost)], [t('التكلفة الفعلية'), viewing.actualCost ? money(viewing.actualCost) : '—'], [t('الإلحاح'), t(viewing.urgency)], [t('الحالة'), t(viewing.status)], [t('نموذج الدفع'), viewing.recurring ? t('متكرر') + ' (' + t(viewing.freq ?? '') + ')' : t('مرة واحدة')]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
          </div>
          {viewing.recurring && viewing.status === 'معتمد' && <p className="mb-3 rounded-lg bg-violet-50 p-2 text-xs font-bold text-violet-800">{t('اشتراك نشط — الفوترة القادمة:')} {viewing.timeline.length > 0 ? t('حسب التكرار') + ' ' + t(viewing.freq ?? '') : ''}</p>}
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('المرفقات')}</p>
          <div className="mb-3">
            <AttachmentBadgeList attachments={viewing.attachments} />
          </div>
          <p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('الخط الزمني للحالات')}</p>
          <div className="space-y-1">{viewing.timeline.map((timelineItem, i) => <p key={i} className="rounded-md border p-2 text-[11px] font-bold text-muted-foreground">• {t(timelineItem)}</p>)}</div>
        </>}
      </Modal>
      <ConfirmDialog open={!!cancelling} onOpenChange={v => { if (!v) setCancelling(null) }} destructive title={t('إلغاء طلب الخدمة')} loading={cancel.isPending}
        description={t('هل أنت متأكد من رغبتك في إلغاء طلب الخدمة؟') + ' ' + (cancelling ?? '')}
        confirmLabel={t('إلغاء الطلب')} onConfirm={() => cancel.mutate(cancelling!)} />
    </div>
  )
}
