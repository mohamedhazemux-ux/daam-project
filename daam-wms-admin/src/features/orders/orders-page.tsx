import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/tables/data-table'
import { Modal, StatusBadge, selectCls } from '@/components/common'
import { ordersService } from '@/services/orders.service'
import { merchantService } from '@/services/merchant.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV, money } from '@/lib/utils'
import { printPackingSlipPDF, printShippingLabelPDF } from '@/lib/pdf-utils'
import type { Order } from '@/types'
import { Download, Eye, Printer, Search, Truck } from 'lucide-react'

const STATUSES = ['معلق', 'قيد المعالجة', 'جاري الشحن', 'مكتمل', 'ارجاع', 'ملغي']
const PICKERS = ['سعود الفهد', 'ماجد العوفي', 'وليد حسن']

export default function OrdersPage() {
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

  const [viewing, setViewing] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState<Order['status']>('معلق')
  const [picker, setPicker] = useState('')
  const invalidate = () => qc.invalidateQueries({ queryKey: ['orders'] })

  const setStatusMut = useMutation({
    mutationFn: (v: { ids: string[]; status: Order['status'] }) => ordersService.setStatus(v.ids, v.status),
    onSuccess: () => { toast.success('تم التحقق بنجاح: تم تحديث حالة الطلب بنجاح'); invalidate() },
  })
  const assignMut = useMutation({
    mutationFn: (v: { id: string; picker: string }) => ordersService.assignPicker(v.id, v.picker),
    onSuccess: () => { toast.success('تم إسناد الطلب إلى المنتقي بنجاح'); invalidate() },
  })

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
    toast.success('تم تجهيز قائمة التجميع والطباعة (PDF)')
  }
  const printLabel = (id: string) => {
    const o = (data?.rows ?? []).find(x => x.id === id) || (viewing?.id === id ? viewing : null)
    if (!o) {
      toast.error('الطلب غير موجود')
      return
    }
    ordersService.printLabel(id)
      .then(() => {
        printShippingLabelPDF({
          orderNumber: o.id,
          customerName: o.cust,
          shippingAddress: 'الرياض — المملكة العربية السعودية',
          merchantName: o.m,
          trackingNumber: 'TRK-88' + o.id.slice(-4),
          date: arDate(o.date)
        })
        toast.success('تم إنشاء بوليصة الشحن (PDF) وتنزيلها')
      })
      .catch(e => toast.error((e as Error).message))
  }

  const columns: ColumnDef<Order, unknown>[] = [
    { id: 'id', header: 'رقم الطلب', cell: ({ row }) => <button className="font-bold underline-offset-4 hover:underline" onClick={() => navigate(`/records/order/${row.original.id}`)}>{row.original.id}</button> },
    { accessorKey: 'm', header: 'التاجر' },
    { id: 'date', header: 'التاريخ', cell: ({ row }) => arDate(row.original.date) },
    { accessorKey: 'items', header: 'المنتجات', cell: ({ row }) => row.original.items + ' منتجات' },
    { id: 'total', header: 'الإجمالي', cell: ({ row }) => <b>{money(row.original.total)}</b> },
    { id: 'ship', header: 'مسؤولية الشحن', cell: ({ row }) => <StatusBadge value={row.original.ship} /> },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="size-8" aria-label="عرض التفاصيل" onClick={() => navigate(`/records/order/${row.original.id}`)}><Eye className="size-4" /></Button>
        <Button variant="outline" size="icon" className="size-8" aria-label="قائمة التعبئة" onClick={() => printSlip(row.original)}><Printer className="size-4" /></Button>
        <Button variant="outline" size="icon" className="size-8" aria-label="بوليصة الشحن" onClick={() => printLabel(row.original.id)}><Truck className="size-4" /></Button>
      </div>) },
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
            <span>تم تحديد {ids.length} طلب</span>
            <select className={selectCls} defaultValue="" aria-label="تحديث جماعي للحالة" onChange={e => { if (!e.target.value) return; setStatusMut.mutate({ ids, status: e.target.value as Order['status'] }); clear() }}>
              <option value="">تحديث جماعي للحالة...</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث برقم الطلب أو التاجر أو العميل..." className="pe-9" aria-label="بحث في الطلبات" />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={selectCls} value={ship} onChange={e => { setShip(e.target.value); setPage(1) }} aria-label="تصفية حسب مسؤولية الشحن">
              <option value="">مسؤولية الشحن: الكل</option>
              <option value="منصة">شحن المنصة</option>
              <option value="ذاتي">شحن ذاتي</option>
            </select>
            <select className={selectCls} value={merchant} onChange={e => { setMerchant(e.target.value); setPage(1) }} aria-label="تصفية حسب التاجر">
              <option value="">كل التجار</option>
              {(merchants?.rows ?? []).map(m => <option key={m.id} value={m.store}>{m.store}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('orders', ['رقم الطلب', 'التاجر', 'التاريخ', 'الحالة', 'الإجمالي', 'مسؤولية الشحن'], (data?.rows ?? []).map(o => [o.id, o.m, o.date, o.status, o.total, o.ship])); toast.success('تم تصدير الملف بنجاح') }}>تصدير</Button>
          </div>
        }
      />

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        wide
        title={'تفاصيل الطلب — ' + (viewing?.id ?? '')}
        footer={<>
          <Button variant="outline" onClick={() => viewing && printSlip(viewing)}><Printer className="size-4" /> قائمة التعبئة</Button>
          {viewing?.ship === 'منصة'
            ? <Button variant="outline" onClick={() => viewing && printLabel(viewing.id)}><Truck className="size-4" /> بوليصة الشحن</Button>
            : <Button variant="outline" onClick={() => toast.success('تم تنزيل بوليصة التاجر (PDF)')}><Download className="size-4" /> تحميل بوليصة التاجر</Button>}
          <Button disabled={setStatusMut.isPending} onClick={() => viewing && setStatusMut.mutate({ ids: [viewing.id], status: newStatus }, { onSettled: () => setViewing(null) })}>حفظ التغييرات</Button>
        </>}
      >
        {viewing && <>
          {viewing.ship === 'ذاتي' && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
              هذا الطلب ذاتي الشحن بواسطة التاجر — بوليصة شحن المنصة غير قابلة للتطبيق، والإدارة تتم بواسطة التاجر (CR-006).
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[['التاجر', viewing.m], ['العميل', viewing.cust], ['التاريخ', arDate(viewing.date)],
              ['مسؤولية الشحن', <StatusBadge key="s" value={viewing.ship} />],
              ['الإجمالي', money(viewing.total) + (viewing.ship === 'ذاتي' ? ' (بدون شحن)' : '')],
              ['رقم التتبع', viewing.ship === 'ذاتي' ? 'TRK-88' + viewing.id.slice(-4) + ' (بواسطة التاجر)' : 'بانتظار الإنشاء']].map(([k, v]) => (
              <div key={k as string} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>
            ))}
          </div>
          <h4 className="mb-2 mt-4 text-sm font-extrabold">منتجات الطلب</h4>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المنتج</th><th className="p-2 text-start font-extrabold">الكمية</th><th className="p-2 text-start font-extrabold">السعر</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2">قهوة عربية مختصة 1كجم</td><td className="p-2">2</td><td className="p-2">{money(180)}</td></tr>
                <tr><td className="p-2">بن محمص كولومبي 500جم</td><td className="p-2">1</td><td className="p-2">{money(Math.max(0, viewing.total - 180))}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div><Label>تحديث حالة الطلب</Label>
              <select className={selectCls + ' w-full'} value={newStatus} onChange={e => setNewStatus(e.target.value as Order['status'])}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><Label>إسناد الطلب إلى منتقي</Label>
              <div className="flex gap-2">
                <select className={selectCls + ' w-full'} value={picker} onChange={e => setPicker(e.target.value)}>
                  <option value="">اختر المنتقي...</option>
                  {PICKERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <Button variant="outline" disabled={!picker} onClick={() => viewing && assignMut.mutate({ id: viewing.id, picker })}>إسناد</Button>
              </div></div>
          </div>
        </>}
      </Modal>
    </div>
  )
}
