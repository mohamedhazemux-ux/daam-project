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
import { ActionButtons, Modal, StatusBadge, selectCls } from '@/components/common'
import { ordersService } from '@/services/orders.service'
import { merchantService } from '@/services/merchant.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV, money } from '@/lib/utils'
import { printPackingSlipPDF, printShippingLabelPDF } from '@/lib/pdf-utils'
import { useT } from '@/lib/i18n'
import type { Order } from '@/types'
import { CheckCircle, CheckCheck, Eye, PackageCheck, Printer, Search, Send, Store, Truck, XCircle } from 'lucide-react'

const STATUSES = ['معلق', 'قيد التنفيذ', 'قيد التغليف', 'جاهز للاستلام', 'قيد التوصيل', 'مكتمل', 'مرفوض', 'ملغي']

export default function OrdersPage() {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [ship, setShip] = useState('')
  const [merchant, setMerchant] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, ship, merchant, page, pageSize: 10 }), [dq, status, ship, merchant, page])
  const { data, isLoading } = useQuery({ queryKey: ['orders', qp], queryFn: () => ordersService.list(qp) })
  const { data: merchants } = useQuery({ queryKey: ['merchants-all'], queryFn: () => merchantService.list({ pageSize: 100 }) })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['orders'] })

  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null)
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [reasonText, setReasonText] = useState('')
  const [reasonErr, setReasonErr] = useState('')

  const acceptMut = useMutation({
    mutationFn: (id: string) => ordersService.acceptOrder(id),
    onSuccess: () => { toast.success(t('تم قبول الطلب وبدء التنفيذ بنجاح')); invalidate() },
    onError: e => toast.error((e as Error).message),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersService.rejectOrder(id, reason),
    onSuccess: () => { toast.success(t('تم رفض الطلب بنجاح')); setRejectingOrder(null); invalidate() },
    onError: e => toast.error((e as Error).message),
  })

  const packMut = useMutation({
    mutationFn: (id: string) => ordersService.packOrder(id),
    onSuccess: () => { toast.success(t('تم نقل الطلب إلى قيد التغليف والتجهيز')); invalidate() },
    onError: e => toast.error((e as Error).message),
  })

  const pickupMut = useMutation({
    mutationFn: (id: string) => ordersService.pickupOrder(id),
    onSuccess: () => { toast.success(t('تم تحديث حالة الطلب: جاهز للاستلام')); invalidate() },
    onError: e => toast.error((e as Error).message),
  })

  const deliveryMut = useMutation({
    mutationFn: (id: string) => ordersService.startDelivery(id),
    onSuccess: () => { toast.success(t('تم بدء الشحن ونقل الطلب إلى قيد التوصيل')); invalidate() },
    onError: e => toast.error((e as Error).message),
  })

  const completeMut = useMutation({
    mutationFn: (id: string) => ordersService.completeOrder(id),
    onSuccess: () => { toast.success(t('تم اكتمال الطلب وتنفيذه بنجاح')); invalidate() },
    onError: e => toast.error((e as Error).message),
  })

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersService.cancelOrder(id, reason),
    onSuccess: () => { toast.success(t('تم إلغاء الطلب بنجاح')); setCancellingOrder(null); invalidate() },
    onError: e => toast.error((e as Error).message),
  })

  const setStatusMut = useMutation({
    mutationFn: (v: { ids: string[]; status: Order['status'] }) => ordersService.setStatus(v.ids, v.status),
    onSuccess: () => { toast.success(t('تم تحديث حالة الطلبات المحددة بنجاح')); invalidate() },
  })

  const [carrierModalOpen, setCarrierModalOpen] = useState(false)
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<string | null>(null)
  const [selectedCarrier, setSelectedCarrier] = useState('أرامكس (Aramex)')

  const printSlip = (order: Order) => {
    printPackingSlipPDF({
      orderNumber: order.id,
      customerName: order.cust,
      shippingAddress: 'الرياض — المملكة العربية السعودية',
      shippingMethod: order.ship === 'منصة' ? 'شحن المنصة' : 'الشحن الذاتي',
      merchantName: order.m,
      items: [
        { name: 'منتج بن قمم إثيوبي 250ج', sku: 'COF-101', quantity: 2 },
        { name: 'أدوات العناية الفاخرة', sku: 'CARE-05', quantity: 1 }
      ],
      date: arDate(order.date),
    })
    toast.success(t('تم تجهيز قائمة التجميع والطباعة (PDF)'))
  }

  const openLabelModal = (id: string) => {
    const o = (data?.rows ?? []).find(x => x.id === id)
    if (!o) {
      toast.error(t('الطلب غير موجود'))
      return
    }
    if (o.ship === 'ذاتي') {
      toast.error(t('إدارة بوليصة الشحن تتم بواسطة التاجر للطلبات ذاتية الشحن'))
      return
    }
    setSelectedOrderForLabel(id)
    setCarrierModalOpen(true)
  }

  const confirmPrintLabel = (carrier: string) => {
    if (!selectedOrderForLabel) return
    const id = selectedOrderForLabel
    const o = (data?.rows ?? []).find(x => x.id === id)
    if (!o) return

    ordersService.printLabel(id)
      .then(() => {
        printShippingLabelPDF({
          orderNumber: o.id,
          customerName: o.cust,
          shippingAddress: 'الرياض — المملكة العربية السعودية',
          merchantName: o.m,
          trackingNumber: 'TRK-88' + o.id.slice(-4),
          date: arDate(o.date),
          carrier,
        })
        toast.success(t('تم إنشاء بوليصة الشحن عبر (') + carrier + t(') وتنزيلها'))
        setCarrierModalOpen(false)
      })
      .catch(e => toast.error((e as Error).message))
  }

  const columns: ColumnDef<Order, unknown>[] = [
    { id: 'id', header: t('رقم الطلب'), cell: ({ row }) => <button className="font-bold underline-offset-4 hover:underline" onClick={() => navigate(`/records/order/${row.original.id}`)}>{row.original.id}</button> },
    { id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },
    { id: 'date', header: t('التاريخ'), cell: ({ row }) => arDate(row.original.date) },
    { accessorKey: 'items', header: t('المنتجات'), cell: ({ row }) => row.original.items + ' ' + t('منتجات') },
    { id: 'total', header: t('الإجمالي'), cell: ({ row }) => <b>{money(row.original.total)}</b> },
    { id: 'ship', header: t('مسؤولية الشحن'), cell: ({ row }) => <StatusBadge value={row.original.ship === 'ذاتي' ? 'شحن ذاتي' : 'شحن المنصة'} /> },
    { id: 'status', header: t('الحالة'), cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => {
      const o = row.original
      const isSelf = o.ship === 'ذاتي'
      const isPlatform = o.ship === 'منصة'

      return (
        <ActionButtons actions={[
          { icon: Eye, label: t('عرض التفاصيل'), onClick: () => navigate(`/records/order/${o.id}`) },
          // Step 1: معلق
          { icon: CheckCircle, label: t('قبول الطلب (Accept)'), onClick: () => acceptMut.mutate(o.id), hidden: o.status !== 'معلق' },
          { icon: XCircle, label: t('رفض الطلب (Reject)'), variant: 'destructive', onClick: () => { setRejectingOrder(o); setReasonText(''); setReasonErr('') }, hidden: o.status !== 'معلق' },
          // Step 2: قيد التنفيذ
          { icon: PackageCheck, label: t('تغليف وتجهيز (Pack)'), onClick: () => packMut.mutate(o.id), hidden: o.status !== 'قيد التنفيذ' },
          // Step 3: قيد التغليف
          { icon: Store, label: t('جاهز للاستلام (Pick-up)'), onClick: () => pickupMut.mutate(o.id), hidden: o.status !== 'قيد التغليف' },
          // Step 4: جاهز للاستلام
          { icon: CheckCheck, label: t('اكتمال وتسليم (Complete)'), onClick: () => completeMut.mutate(o.id), hidden: !(o.status === 'جاهز للاستلام' && isSelf) },
          { icon: Truck, label: t('بدء الشحن (Start delivery)'), onClick: () => deliveryMut.mutate(o.id), hidden: !(o.status === 'جاهز للاستلام' && isPlatform) },
          // Step 5: قيد التوصيل (منصة)
          { icon: CheckCheck, label: t('اكتمال وتوصيل (Complete)'), onClick: () => completeMut.mutate(o.id), hidden: !(o.status === 'قيد التوصيل' && isPlatform) },
          // Cancel available at any stage after acceptance
          { icon: XCircle, label: t('إلغاء الطلب (Cancel)'), variant: 'destructive', onClick: () => { setCancellingOrder(o); setReasonText(''); setReasonErr('') }, hidden: !['قيد التنفيذ', 'قيد التغليف', 'جاهز للاستلام', 'قيد التوصيل'].includes(o.status) },
          { icon: Printer, label: t('قائمة التعبئة والتجهيز'), onClick: () => printSlip(o) },
          { icon: Truck, label: t('بوليصة الشحن (PDF)'), onClick: () => openLabelModal(o.id), hidden: isSelf },
        ]} />
      )
    }},
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        loading={isLoading}
        getRowId={r => r.id}
        selectable
        bulkActions={(ids, clear) => (
          <>
            <span>{t('تحديد الصف')}: {ids.length}</span>
            <select className={selectCls} defaultValue="" aria-label={t('تحديث جماعي للحالة...')} onChange={e => { if (!e.target.value) return; setStatusMut.mutate({ ids, status: e.target.value as Order['status'] }); clear() }}>
              <option value="">{t('تحديث جماعي للحالة...')}</option>
              {STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
          </>
        )}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث برقم الطلب أو التاجر أو العميل...')} className="pe-9" aria-label={t('بحث برقم الطلب أو التاجر أو العميل...')} />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label={t('تصفية حسب الحالة')}>
              <option value="">{t('كل الحالات')}</option>
              {STATUSES.map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <select className={selectCls} value={ship} onChange={e => { setShip(e.target.value); setPage(1) }} aria-label={t('تصفية حسب مسؤولية الشحن')}>
              <option value="">{t('مسؤولية الشحن: الكل')}</option>
              <option value="منصة">{t('شحن المنصة')}</option>
              <option value="ذاتي">{t('الشحن الذاتي')}</option>
            </select>
            <select className={selectCls} value={merchant} onChange={e => { setMerchant(e.target.value); setPage(1) }} aria-label={t('كل التجار')}>
              <option value="">{t('كل التجار')}</option>
              {(merchants?.rows ?? []).map(m => <option key={m.id} value={m.store}>{m.store}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('orders', ['رقم الطلب', 'التاجر', 'التاريخ', 'الحالة', 'الإجمالي', 'مسؤولية الشحن'], (data?.rows ?? []).map(o => [o.id, o.m, o.date, o.status, o.total, o.ship])); toast.success(t('تم تصدير الملف بنجاح')) }}>{t('تصدير')}</Button>
          </div>
        }
      />

      {/* Reject Order Modal */}
      <Modal open={!!rejectingOrder} onClose={() => setRejectingOrder(null)} title={t('رفض الطلب') + ' — ' + (rejectingOrder?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setRejectingOrder(null)}>{t('إلغاء')}</Button>
          <Button variant="destructive" disabled={rejectMut.isPending} onClick={() => {
            const v = reasonText.trim()
            if (!v || v.length < 5 || v.length > 500) {
              setReasonErr(t('سبب الرفض إلزامي ويجب أن يكون بين 5 و 500 حرف'))
              return
            }
            setReasonErr('')
            rejectMut.mutate({ id: rejectingOrder!.id, reason: v })
          }}>{t('تأكيد رفض الطلب')}</Button>
        </>}>
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground">
            {t('عند رفض الطلب سيتم إغلاقه كطلب غير منفذ وإشعار التاجر بسبب الرفض.')}
          </p>
          <div>
            <Label>{t('سبب الرفض')} <span className="text-destructive">*</span> ({t('5 – 500 حرف')})</Label>
            <Textarea
              placeholder={t('اكتب سبب رفض طلب الشحنة بالتفصيل...')}
              value={reasonText}
              maxLength={500}
              onChange={e => setReasonText(e.target.value)}
            />
            {reasonErr && <p className="mt-1 text-xs font-bold text-destructive">{reasonErr}</p>}
          </div>
        </div>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal open={!!cancellingOrder} onClose={() => setCancellingOrder(null)} title={t('إلغاء الطلب') + ' — ' + (cancellingOrder?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => setCancellingOrder(null)}>{t('تراجع')}</Button>
          <Button variant="destructive" disabled={cancelMut.isPending} onClick={() => {
            const v = reasonText.trim()
            if (!v || v.length < 5 || v.length > 500) {
              setReasonErr(t('سبب الإلغاء إلزامي ويجب أن يكون بين 5 و 500 حرف'))
              return
            }
            setReasonErr('')
            cancelMut.mutate({ id: cancellingOrder!.id, reason: v })
          }}>{t('تأكيد إلغاء الطلب')}</Button>
        </>}>
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground">
            {t('إلغاء الطلب سينهي دورة الطلب بحالة ملغي مع حفظ سبب الإلغاء في سجل النشاط.')}
          </p>
          <div>
            <Label>{t('سبب الإلغاء')} <span className="text-destructive">*</span> ({t('5 – 500 حرف')})</Label>
            <Textarea
              placeholder={t('اكتب سبب إلغاء الطلب...')}
              value={reasonText}
              maxLength={500}
              onChange={e => setReasonText(e.target.value)}
            />
            {reasonErr && <p className="mt-1 text-xs font-bold text-destructive">{reasonErr}</p>}
          </div>
        </div>
      </Modal>

      {/* Carrier Selection Modal */}
      <Modal
        open={carrierModalOpen}
        onClose={() => setCarrierModalOpen(false)}
        title={t('اختيار شركة الشحن المعتمدة للطلب')}
        footer={
          <>
            <Button variant="outline" onClick={() => setCarrierModalOpen(false)}>{t('إلغاء')}</Button>
            <Button onClick={() => confirmPrintLabel(selectedCarrier)}>{t('تأكيد وإنشاء البوليصة')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs font-bold text-muted-foreground">
            {t('حدد شركة الشحن المعتمدة عبر المنصة لتوليد باركود التتبع وبوليصة الشحن (AWB):')}
          </p>
          <div className="space-y-2">
            {[
              { id: 'aramex', name: 'أرامكس (Aramex)', time: 'توصيل خلال 24 - 48 ساعة' },
              { id: 'smsa', name: 'سمسا إكسبريس (SMSA Express)', time: 'توصيل سريع لكافة المدن' },
              { id: 'spl', name: 'سبل - البريد السعودي (SPL)', time: 'تغطية شاملة وموثوقة' },
              { id: 'dhl', name: 'دي إتش إل (DHL Express)', time: 'شحن فائق السرعة' },
            ].map(c => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                  selectedCarrier === c.name ? 'border-foreground bg-accent/60 shadow-sm' : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="carrier_opt"
                    checked={selectedCarrier === c.name}
                    onChange={() => setSelectedCarrier(c.name)}
                    className="size-4 accent-foreground"
                  />
                  <div>
                    <p className="text-sm font-extrabold">{t(c.name)}</p>
                    <p className="text-xs text-muted-foreground">{t(c.time)}</p>
                  </div>
                </div>
                <Truck className="size-5 text-muted-foreground" />
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}

