// src/features/merchant/merchant-record-detail-page.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  FileDown, 
  FileText, 
  HelpCircle, 
  Package, 
  Pencil, 
  Printer, 
  RotateCcw, 
  Trash2, 
  TrendingUp, 
  XCircle 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AttachmentBadgeList, ConfirmDialog, FileUploadWithPreview, Modal, StatusBadge, selectCls } from '@/components/common'
import { db } from '@/mocks/db'
import { merchantOrders, merchantOrdersService } from '@/services/merchant-orders.service'
import { merchantReturns, merchantReturnsService } from '@/services/merchant-returns.service'
import { SERVICE_REQUESTS, merchantServicesService } from '@/services/merchant-services.service'
import { merchantProducts, merchantProductsService } from '@/services/merchant-products.service'
import { merchantFinanceService } from '@/services/merchant-finance.service'
import { merchantInventoryService } from '@/services/merchant-inventory.service'
import { inventoryService } from '@/services/inventory.service'
import { downloadCSV, money } from '@/lib/utils'
import { printInvoicePDF, printPackingSlipPDF, printReportPDF, printShippingLabelPDF } from '@/lib/pdf-utils'
import { useT } from '@/lib/i18n'
import { useAuthStore } from '@/store/auth-store'
import { usePrefsStore } from '@/store/prefs-store'

type MerchantKind = 'order' | 'return' | 'service-request' | 'stock-request' | 'withdrawal' | 'invoice' | 'product'

export default function MerchantRecordDetailPage() {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const lang = usePrefsStore(s => s.lang)
  const { kind, id } = useParams<{ kind: MerchantKind; id: string }>()

  // Carrier Modal for Orders
  const [carrierModalOpen, setCarrierModalOpen] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState('أرامكس (Aramex)')
  
  // Generic Cancel Dialog
  const [cancelling, setCancelling] = useState(false)

  // Product Edit Modal State
  const [editProductOpen, setEditProductOpen] = useState(false)
  const [productForm, setProductForm] = useState({ name: '', desc: '', price: 0, img: '' })
  const [productErr, setProductErr] = useState('')

  // Product Stock Adjustment Modal State
  const [adjOpen, setAdjOpen] = useState(false)
  const [adjForm, setAdjForm] = useState({ type: 'إضافة', qty: 1, reason: '' })
  const [adjErr, setAdjErr] = useState('')

  // Product Delete Confirmation
  const [deletingProduct, setDeletingProduct] = useState(false)

  // Resolve record data based on kind
  let data: any = null
  let listPath = '/merchant'
  let sectionTitle = t('الرئيسية')
  let pageTitle = t('تفاصيل السجل')

  if (kind === 'order') {
    listPath = '/merchant/orders'
    sectionTitle = t('الطلبات')
    pageTitle = t('تفاصيل الطلب')
    data = merchantOrders.find(x => x.ref === id) || db.orders.find(x => x.id === id)
  } else if (kind === 'return') {
    listPath = '/merchant/returns'
    sectionTitle = t('المرتجعات')
    pageTitle = t('تفاصيل المرتجع')
    data = merchantReturns.find(x => x.ref === id) || db.returns.find(x => x.ref === id)
  } else if (kind === 'service-request') {
    listPath = '/merchant/services'
    sectionTitle = t('طلبات الخدمة')
    pageTitle = t('تفاصيل طلب الخدمة')
    data = SERVICE_REQUESTS.find(x => x.ref === id) || db.serviceRequests.find(x => x.ref === id)
  } else if (kind === 'stock-request') {
    listPath = '/merchant/inventory'
    sectionTitle = t('المخزون')
    pageTitle = t('تفاصيل طلب المخزون')
    data = db.stockRequests.find(x => x.id === id)
  } else if (kind === 'withdrawal') {
    listPath = '/merchant/wallet'
    sectionTitle = t('المحفظة والمالية')
    pageTitle = t('تفاصيل طلب السحب')
    data = db.withdrawals.find(x => x.id === id)
  } else if (kind === 'invoice') {
    listPath = '/merchant/wallet'
    sectionTitle = t('الفواتير الشهرية')
    pageTitle = t('تفاصيل الفاتورة')
    data = db.invoices.find(x => x.ref === id)
  } else if (kind === 'product') {
    listPath = '/merchant/products'
    sectionTitle = t('المنتجات')
    pageTitle = t('تفاصيل المنتج')
    data = merchantProducts.find(x => x.ref === id)
  }

  // Cancellation Mutations
  const cancelOrder = useMutation({
    mutationFn: async () => {
      if (!id) return
      return merchantOrdersService.cancel(id)
    },
    onSuccess: () => {
      toast.success(t('تم إلغاء الطلب بنجاح'))
      qc.invalidateQueries({ queryKey: ['m-orders'] })
      setCancelling(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelReturn = useMutation({
    mutationFn: async () => {
      if (!id) return
      return merchantReturnsService.cancel(id)
    },
    onSuccess: () => {
      toast.success(t('تم إلغاء طلب الإرجاع بنجاح'))
      qc.invalidateQueries({ queryKey: ['m-returns'] })
      setCancelling(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelService = useMutation({
    mutationFn: async () => {
      if (!id) return
      return merchantServicesService.cancel(id)
    },
    onSuccess: () => {
      toast.success(t('تم إلغاء طلب الخدمة بنجاح'))
      qc.invalidateQueries({ queryKey: ['m-services'] })
      setCancelling(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelStock = useMutation({
    mutationFn: async () => {
      if (!id) return
      return merchantInventoryService.cancel(id)
    },
    onSuccess: () => {
      toast.success(t('تم إلغاء طلب المخزون بنجاح'))
      qc.invalidateQueries({ queryKey: ['m-stock-reqs'] })
      setCancelling(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelWithdrawal = useMutation({
    mutationFn: async () => {
      if (!id) return
      return merchantFinanceService.cancelWithdrawal(id)
    },
    onSuccess: () => {
      toast.success(t('تم إلغاء طلب السحب بنجاح'))
      qc.invalidateQueries({ queryKey: ['m-wd'] })
      qc.invalidateQueries({ queryKey: ['m-wallet'] })
      setCancelling(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Product Mutations
  const updateProduct = useMutation({
    mutationFn: async () => {
      if (!id) return
      return merchantProductsService.update(id, {
        name: productForm.name,
        desc: productForm.desc,
        price: productForm.price,
      })
    },
    onSuccess: () => {
      toast.success(t('تم تحديث بيانات المنتج بنجاح'))
      qc.invalidateQueries({ queryKey: ['merchant-products'] })
      setEditProductOpen(false)
    },
    onError: (e: Error) => setProductErr(e.message),
  })

  const toggleProductStatus = useMutation({
    mutationFn: async () => {
      if (!id) return
      return merchantProductsService.toggle(id)
    },
    onSuccess: () => {
      toast.success(t('تم تغيير حالة المنتج بنجاح'))
      qc.invalidateQueries({ queryKey: ['merchant-products'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeProduct = useMutation({
    mutationFn: async () => {
      if (!id) return
      return merchantProductsService.remove(id)
    },
    onSuccess: () => {
      toast.success(t('تم حذف المنتج بنجاح'))
      qc.invalidateQueries({ queryKey: ['merchant-products'] })
      setDeletingProduct(false)
      navigate('/merchant/products')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const submitProductAdjustment = useMutation({
    mutationFn: async () => {
      if (!data) return
      return inventoryService.adjust(data.name, t('المستودع الرئيسي'), adjForm.type, adjForm.qty, adjForm.reason)
    },
    onSuccess: () => {
      toast.success(t('تم إرسال طلب تعديل المخزون بنجاح'))
      setAdjOpen(false)
    },
    onError: (e: Error) => setAdjErr(e.message),
  })

  const handleCancel = () => {
    if (kind === 'order') cancelOrder.mutate()
    else if (kind === 'return') cancelReturn.mutate()
    else if (kind === 'service-request') cancelService.mutate()
    else if (kind === 'stock-request') cancelStock.mutate()
    else if (kind === 'withdrawal') cancelWithdrawal.mutate()
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 py-8 text-center">
        <div className="rounded-2xl border bg-card p-12 shadow-sm">
          <HelpCircle className="mx-auto size-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-black">{t('السجل غير موجود')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('لم يتم العثور على بيانات للسجل المطلوب أو ربما تم حذفه.')}</p>
          <Button className="mt-6" onClick={() => navigate(listPath)}>
            {t('العودة إلى')} {sectionTitle}
          </Button>
        </div>
      </div>
    )
  }

  // Extract attachments
  const attachmentList: string[] = (() => {
    const raw = data.attachments || data.attachment || data.label || data.img
    if (Array.isArray(raw)) return raw.filter(Boolean)
    if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
    return []
  })()

  // Timeline items
  const timeline: string[] = (() => {
    if (data.timeline && Array.isArray(data.timeline)) return data.timeline
    if (data.log && Array.isArray(data.log)) return data.log
    const dateStr = data.date || data.createdAt || data.created || data.gen || '2026-02-01'
    return [`${t('إنشاء السجل')} — ${dateStr}`, `${t('الحالة الحالية')}: ${t(data.status || 'معلق')}`]
  })()

  const isPending = data.status === 'معلق'

  // PDF Generators
  const generateShippingLabel = (carrier = 'أرامكس (Aramex)') => {
    printShippingLabelPDF({
      orderNumber: data.ref || data.id,
      customerName: data.cust || t('العميل'),
      shippingAddress: data.address || t('العنوان المسجل'),
      merchantName: data.m || user?.store || t('المتجر'),
      trackingNumber: data.tracking || 'TRK-' + (data.ref || data.id).replace(/\D/g, '').slice(-6),
      date: data.date || todayDate(),
      carrier,
    })
    toast.success(`${t('تم تجهيز بوليصة الشحن عبر')} (${carrier}) ${t('بصيغة PDF')}`)
    setCarrierModalOpen(false)
  }

  const generatePackingSlip = () => {
    printPackingSlipPDF({
      orderNumber: data.ref || data.id,
      customerName: data.cust || t('العميل'),
      shippingAddress: data.address || t('العنوان المسجل'),
      shippingMethod: data.shipResp === 'منصة' ? t('شحن المنصة الداعمة') : t('الشحن الذاتي'),
      merchantName: data.m || user?.store || t('المتجر'),
      items: (data.items ?? []).map((it: any) => ({
        name: it.name || it.p || t('منتج'),
        sku: it.sku || 'SKU-001',
        quantity: it.qty || it.q || 1,
      })),
      date: data.date || todayDate(),
    })
    toast.success(t('تم تجهيز قائمة التجميع بصيغة PDF'))
  }

  const generateReturnLabel = () => {
    printShippingLabelPDF({
      orderNumber: 'RET-' + (data.ref || data.id),
      customerName: data.m || user?.store || t('المتجر'),
      shippingAddress: t('مستودع المنصة الداعمة الرئيسي — الرياض'),
      merchantName: data.cust || t('العميل'),
      trackingNumber: 'RET-TRK-' + (data.ref || data.id).replace(/\D/g, '').slice(-5),
      date: data.date || todayDate(),
      carrier: t('أرامكس — شحن مرتجع'),
    })
    toast.success(t('تم تجهيز بوليصة الإرجاع بصيغة PDF'))
  }

  const generateServiceReceipt = () => {
    printReportPDF({
      title: `${t('إيصال طلب خدمة مساندة')} — ${data.ref || data.id}`,
      date: data.date || todayDate(),
      lang,
      metrics: [
        { label: t('نوع الخدمة'), value: data.type },
        { label: t('الكمية'), value: data.qty },
        { label: t('التكلفة التقديرية'), value: money(data.cost) },
        { label: t('الحالة'), value: t(data.status) },
      ],
      tableHeaders: [t('البيان'), t('التفاصيل')],
      tableRows: [
        [t('رقم الطلب'), data.ref || data.id],
        [t('المنتج المرتبط'), data.p || '—'],
        [t('تاريخ التنفيذ المفضل'), data.prefDate || '—'],
        [t('الملاحظات'), data.notes || '—'],
      ],
    })
    toast.success(t('تم تجهيز إيصال الخدمة بصيغة PDF'))
  }

  const generateStockReceipt = () => {
    printReportPDF({
      title: `${t('إذن')} ${data.type || t('إضافة')} ${t('مخزون')} — ${data.id}`,
      date: data.date || todayDate(),
      lang,
      metrics: [
        { label: t('نوع الطلب'), value: data.type },
        { label: t('الكمية'), value: data.qty },
        { label: t('المستودع'), value: data.wh },
        { label: t('الحالة'), value: t(data.status) },
      ],
      tableHeaders: [t('البيان'), t('التفاصيل')],
      tableRows: [
        [t('رقم الطلب'), data.id],
        [t('اسم المنتج'), data.p],
        [t('الكمية المطلوبة'), String(data.qty)],
        [t('الملاحظات'), data.notes || '—'],
      ],
    })
    toast.success(t('تم تجهيز إذن المخزون بصيغة PDF'))
  }

  const generateWithdrawalReceipt = () => {
    printReportPDF({
      title: `${t('إيصال طلب سحب رصيد')} — ${data.id}`,
      date: data.date || todayDate(),
      lang,
      metrics: [
        { label: t('المبلغ المطلوب'), value: money(data.amount) },
        { label: t('طريقة السحب'), value: data.method },
        { label: t('الحالة'), value: t(data.status) },
      ],
      tableHeaders: [t('البيان'), t('التفاصيل')],
      tableRows: [
        [t('رقم الطلب'), data.id],
        [t('المتجر'), data.m || user?.store || '—'],
        [t('الحساب البنكي'), data.acc || '—'],
        [t('الآيبان'), data.iban || '—'],
        [t('الملاحظات'), data.notes || '—'],
      ],
    })
    toast.success(t('تم تجهيز إيصال السحب بصيغة PDF'))
  }

  const generateInvoicePdf = () => {
    printInvoicePDF({
      reference: data.ref,
      period: data.period || 'يناير 2026',
      merchantName: data.m || user?.store || t('التاجر'),
      merchantEmail: data.email || user?.email || 'merchant@daam.sa',
      items: (data.items ?? []).map((it: any) => ({
        description: it.d || it.name || it.description || t('بند الفاتورة'),
        quantity: Number(it.q ?? it.qty ?? 1),
        unitPrice: Number(it.u ?? it.price ?? 0),
        total: Number((it.q ?? it.qty ?? 1) * (it.u ?? it.price ?? 0)),
      })),
      subtotal: Number(data.subtotal ?? (data.total ? data.total / 1.15 : 0)),
      tax: Number(data.tax ?? (data.total ? data.total - data.total / 1.15 : 0)),
      total: Number(data.total ?? 0),
      dueDate: data.due || '',
      createdAt: data.gen || data.createdAt || '',
      status: data.status || 'مكتمل',
    })
    toast.success(t('تم تجهيز الفاتورة بصيغة PDF'))
  }

  function todayDate() {
    return new Date().toISOString().slice(0, 10)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(listPath)} aria-label={t('رجوع')}>
            <ArrowRight className="size-5 rtl:rotate-0 ltr:rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">{sectionTitle} /</span>
              <h1 className="text-xl font-black">{data.ref || data.id || data.name}</h1>
              {data.status && <StatusBadge value={data.status} />}
              {data.shipResp && <StatusBadge value={data.shipResp === 'منصة' ? 'شحن المنصة' : 'الشحن الذاتي'} />}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{pageTitle}</p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Order Specific Actions */}
          {kind === 'order' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setCarrierModalOpen(true)}>
                <Printer className="size-4" />
                {t('طباعة بوليصة الشحن')}
              </Button>
              <Button variant="outline" size="sm" onClick={generatePackingSlip}>
                <FileText className="size-4" />
                {t('قائمة التجميع (Packing Slip)')}
              </Button>
            </>
          )}

          {/* Return Specific Actions */}
          {kind === 'return' && (
            <Button variant="outline" size="sm" onClick={generateReturnLabel}>
              <Printer className="size-4" />
              {t('طباعة بوليصة الإرجاع')}
            </Button>
          )}

          {/* Service Specific Actions */}
          {kind === 'service-request' && (
            <Button variant="outline" size="sm" onClick={generateServiceReceipt}>
              <FileDown className="size-4" />
              {t('طباعة ملخص الخدمة')}
            </Button>
          )}

          {/* Stock Specific Actions */}
          {kind === 'stock-request' && (
            <Button variant="outline" size="sm" onClick={generateStockReceipt}>
              <FileDown className="size-4" />
              {t('طباعة إذن المخزون')}
            </Button>
          )}

          {/* Withdrawal Specific Actions */}
          {kind === 'withdrawal' && (
            <Button variant="outline" size="sm" onClick={generateWithdrawalReceipt}>
              <FileDown className="size-4" />
              {t('طباعة إيصال السحب')}
            </Button>
          )}

          {/* Invoice Specific Actions */}
          {kind === 'invoice' && (
            <Button variant="outline" size="sm" onClick={generateInvoicePdf}>
              <FileDown className="size-4" />
              {t('تنزيل الفاتورة PDF')}
            </Button>
          )}

          {/* Product Specific Actions */}
          {kind === 'product' && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setProductForm({ name: data.name, desc: data.desc || '', price: data.price, img: data.img || '' })
                  setProductErr('')
                  setEditProductOpen(true)
                }}
              >
                <Pencil className="size-4" />
                {t('تعديل')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setAdjForm({ type: 'إضافة', qty: 1, reason: '' })
                  setAdjErr('')
                  setAdjOpen(true)
                }}
              >
                <TrendingUp className="size-4" />
                {t('طلب تعديل مخزون')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toggleProductStatus.mutate()}
                disabled={toggleProductStatus.isPending}
              >
                <RotateCcw className="size-4" />
                {data.status === 'نشط' ? t('تعطيل') : t('تفعيل')}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setDeletingProduct(true)}
              >
                <Trash2 className="size-4" />
                {t('حذف')}
              </Button>
            </>
          )}

          {/* Generic Cancel Button */}
          {isPending && ['order', 'return', 'service-request', 'stock-request', 'withdrawal'].includes(kind ?? '') && (
            <Button variant="destructive" size="sm" onClick={() => setCancelling(true)}>
              <XCircle className="size-4" />
              {t('إلغاء الطلب')}
            </Button>
          )}

          {/* Export Details CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadCSV(`${kind}-${id}`, Object.keys(data).map(k => t(k)), [Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''))])
              toast.success(t('تم تصدير تفاصيل السجل بنجاح'))
            }}
          >
            <Download className="size-4" />
            {t('تصدير')}
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Details (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.total !== undefined && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground">{t('المبلغ الإجمالي')}</p>
                <p className="mt-1 text-lg font-black text-foreground">{money(data.total)}</p>
              </div>
            )}
            {data.amount !== undefined && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground">{t('المبلغ المطلوب')}</p>
                <p className="mt-1 text-lg font-black text-foreground">{money(data.amount)}</p>
              </div>
            )}
            {data.qty !== undefined && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground">{t('الكمية')}</p>
                <p className="mt-1 text-lg font-black text-foreground">{data.qty}</p>
              </div>
            )}
            {data.date && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground">{t('التاريخ')}</p>
                <p className="mt-1 text-sm font-extrabold">{data.date}</p>
              </div>
            )}
            {data.cust && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground">{t('اسم العميل')}</p>
                <p className="mt-1 text-sm font-extrabold truncate">{data.cust}</p>
              </div>
            )}
            {data.tracking && (
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground">{t('رقم التتبع')}</p>
                <p className="mt-1 text-xs font-black tracking-wider" dir="ltr">{data.tracking}</p>
              </div>
            )}
          </div>

          {/* Items Table for Orders */}
          {kind === 'order' && data.items && data.items.length > 0 && (
            <div className="rounded-2xl border bg-card shadow-sm">
              <div className="border-b p-4">
                <h2 className="text-sm font-black flex items-center gap-2">
                  <Package className="size-4 text-muted-foreground" />
                  {t('الأصناف والمنتجات المطلوبة')} ({data.items.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="p-3 text-start font-bold">#</th>
                      <th className="p-3 text-start font-bold">{t('اسم المنتج')}</th>
                      <th className="p-3 text-center font-bold">{t('الكمية')}</th>
                      <th className="p-3 text-start font-bold">{t('السعر الفردي')}</th>
                      <th className="p-3 text-start font-bold">{t('الإجمالي')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-semibold">
                    {data.items.map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3 font-bold">{it.name || it.p}</td>
                        <td className="p-3 text-center font-extrabold">{it.qty || it.q}</td>
                        <td className="p-3">{money(it.price || it.u || 0)}</td>
                        <td className="p-3 font-bold">{money((it.price || it.u || 0) * (it.qty || it.q || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Items Table for Invoices */}
          {kind === 'invoice' && data.items && data.items.length > 0 && (
            <div className="rounded-2xl border bg-card shadow-sm">
              <div className="border-b p-4">
                <h2 className="text-sm font-black flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  {t('بنود ورسوم الفاتورة')}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="p-3 text-start font-bold">{t('الوصف')}</th>
                      <th className="p-3 text-center font-bold">{t('الكمية / المعاملات')}</th>
                      <th className="p-3 text-start font-bold">{t('سعر الوحدة')}</th>
                      <th className="p-3 text-start font-bold">{t('المبلغ الإجمالي')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-semibold">
                    {data.items.map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-3 font-bold">{t(it.d || it.name)}</td>
                        <td className="p-3 text-center font-extrabold">{it.q || it.qty || 1}</td>
                        <td className="p-3">{money(it.u || it.price || 0)}</td>
                        <td className="p-3 font-bold">{money((it.u || it.price || 0) * (it.q || it.qty || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Info Grid */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black">{t('البيانات والمواصفات الكاملة')}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(data)
                .filter(([k, v]) => !['items', 'timeline', 'log', 'attachments', 'attachment', 'label', 'img'].includes(k) && typeof v !== 'object')
                .map(([k, v]) => (
                  <div key={k} className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[11px] font-bold text-muted-foreground">{t(k)}</p>
                    <p className="mt-0.5 text-xs font-black">{typeof v === 'string' ? t(v) : String(v ?? '—')}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info (Timeline & Attachments) */}
        <div className="space-y-6">
          {/* Attachments Card */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-black">{t('المرفقات والوثائق')}</h2>
            <AttachmentBadgeList 
              attachments={attachmentList} 
              emptyText={t('لا توجد مرفقات أو وثائق مرتبطة بهذا السجل.')} 
            />
          </div>

          {/* Timeline Card */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-black flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              {t('سجل الحالات والنشاط')}
            </h2>
            <div className="relative space-y-4 ps-6 before:absolute before:bottom-2 before:start-2 before:top-2 before:w-0.5 before:bg-muted">
              {timeline.map((step, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -start-6 top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[8px] font-black text-background">
                    ✓
                  </span>
                  <p className="text-xs font-bold leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Carrier Selector Modal */}
      <Modal
        open={carrierModalOpen}
        onClose={() => setCarrierModalOpen(false)}
        title={t('اختيار شركة الشحن لطباعة البوليصة')}
        footer={
          <>
            <Button variant="outline" onClick={() => setCarrierModalOpen(false)}>
              {t('إلغاء')}
            </Button>
            <Button onClick={() => generateShippingLabel(selectedCarrier)}>
              <Printer className="size-4" />
              {t('طباعة البوليصة')}
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-2">
          <Label>{t('شركة الشحن المعتمدة')} <span className="text-destructive">*</span></Label>
          <select
            className={selectCls + ' w-full'}
            value={selectedCarrier}
            onChange={e => setSelectedCarrier(e.target.value)}
          >
            {['أرامكس (Aramex)', 'دي إتش إل (DHL)', 'سمسا (SMSA)', 'سبل (SPL)', 'ناقل (Naqel)'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {t('سيتم توليد بوليصة الشحن الرسمية متضمنة الباركود وبيانات العميل والمستودع.')}
          </p>
        </div>
      </Modal>

      {/* Product Edit Modal */}
      <Modal
        open={editProductOpen}
        onClose={() => setEditProductOpen(false)}
        title={t('تعديل بيانات المنتج')}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditProductOpen(false)}>
              {t('إلغاء')}
            </Button>
            <Button 
              disabled={updateProduct.isPending} 
              onClick={() => {
                if (!productForm.name.trim()) { setProductErr(t('اسم المنتج مطلوب')); return }
                if (productForm.name.length < 3) { setProductErr(t('اسم المنتج قصير للغاية')); return }
                if (productForm.price <= 0) { setProductErr(t('يجب أن يكون السعر أكبر من 0')); return }
                setProductErr('')
                updateProduct.mutate()
              }}
            >
              {t('حفظ التعديلات')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div>
            <Label>{t('اسم المنتج')} <span className="text-destructive">*</span></Label>
            <Input 
              value={productForm.name} 
              onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} 
            />
          </div>
          <div>
            <Label>{t('السعر')} <span className="text-destructive">*</span></Label>
            <Input 
              type="number" 
              step="0.01" 
              value={productForm.price || ''} 
              onChange={e => setProductForm(f => ({ ...f, price: +e.target.value }))} 
            />
          </div>
          <div>
            <Label>{t('الوصف')}</Label>
            <Textarea 
              value={productForm.desc} 
              onChange={e => setProductForm(f => ({ ...f, desc: e.target.value }))} 
            />
          </div>
          <div>
            <FileUploadWithPreview
              label={t('صورة المنتج (اختياري)')}
              files={productForm.img ? [productForm.img] : []}
              accept=".jpg,.png,.jpeg,.webp"
              single
              maxSizeMB={5}
              onChange={files => setProductForm(f => ({ ...f, img: files[0] ?? '' }))}
            />
          </div>
          {productErr && <p className="text-xs font-bold text-destructive">{productErr}</p>}
        </div>
      </Modal>

      {/* Product Stock Adjustment Modal */}
      <Modal
        open={adjOpen}
        onClose={() => setAdjOpen(false)}
        title={t('طلب تعديل كمية المخزون — ') + (data?.name ?? '')}
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>
              {t('إلغاء')}
            </Button>
            <Button 
              disabled={submitProductAdjustment.isPending} 
              onClick={() => {
                if (!adjForm.reason.trim()) { setAdjErr(t('سبب التعديل مطلوب')); return }
                if (adjForm.qty <= 0) { setAdjErr(t('الكمية يجب أن تكون أكبر من 0')); return }
                setAdjErr('')
                submitProductAdjustment.mutate()
              }}
            >
              {t('إرسال الطلب للإدارة')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('نوع العملية')} <span className="text-destructive">*</span></Label>
              <select 
                className={selectCls + ' w-full'} 
                value={adjForm.type} 
                onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="إضافة">{t('إضافة مخزون (+)')}</option>
                <option value="سحب">{t('سحب مخزون (-)')}</option>
              </select>
            </div>
            <div>
              <Label>{t('الكمية المطلوبة')} <span className="text-destructive">*</span></Label>
              <Input 
                type="number" 
                min={1} 
                value={adjForm.qty} 
                onChange={e => setAdjForm(f => ({ ...f, qty: Math.max(1, +e.target.value) }))} 
              />
            </div>
          </div>
          <div>
            <Label>{t('سبب الطلب')} <span className="text-destructive">*</span></Label>
            <Textarea 
              value={adjForm.reason} 
              onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} 
              placeholder={t('اذكر سبب طلب تعديل الكمية...')} 
            />
          </div>
          {adjErr && <p className="text-xs font-bold text-destructive">{adjErr}</p>}
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] font-bold text-amber-700">
            ⚠ {t('سيتم مراجعة هذا الطلب من قبل الإدارة قبل تطبيق التغيير على المخزون')}
          </p>
        </div>
      </Modal>

      {/* Delete Product Confirmation Dialog */}
      <ConfirmDialog
        open={deletingProduct}
        onOpenChange={setDeletingProduct}
        destructive
        title={t('حذف المنتج')}
        description={t('هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من الكتالوج؟')}
        confirmLabel={t('حذف المنتج')}
        loading={removeProduct.isPending}
        onConfirm={() => removeProduct.mutate()}
      />

      {/* Generic Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        destructive
        title={t('تأكيد إلغاء الطلب')}
        description={t('هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذه الخطوة.')}
        confirmLabel={t('تأكيد الإلغاء')}
        loading={cancelOrder.isPending || cancelReturn.isPending || cancelService.isPending || cancelStock.isPending || cancelWithdrawal.isPending}
        onConfirm={handleCancel}
      />
    </div>
  )
}
