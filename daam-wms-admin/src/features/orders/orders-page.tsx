import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/tables/data-table'
import { StatusBadge, selectCls } from '@/components/common'
import { ordersService } from '@/services/orders.service'
import { merchantService } from '@/services/merchant.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV, money } from '@/lib/utils'
import { printPackingSlipPDF, printShippingLabelPDF } from '@/lib/pdf-utils'
import type { Order } from '@/types'
import { Eye, Printer, Search, Truck } from 'lucide-react'


const STATUSES = ['معلق', 'قيد المعالجة', 'جاري الشحن', 'مكتمل', 'ارجاع', 'ملغي']

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['orders'] })

  const setStatusMut = useMutation({
    mutationFn: (v: { ids: string[]; status: Order['status'] }) => ordersService.setStatus(v.ids, v.status),
    onSuccess: () => { toast.success('تم التحقق بنجاح: تم تحديث حالة الطلب بنجاح'); invalidate() },
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
    const o = (data?.rows ?? []).find(x => x.id === id)
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
    </div>
  )
}
