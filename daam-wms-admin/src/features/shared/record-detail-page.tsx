// src/features/shared/record-detail-page.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  FileText, 
  HelpCircle, 
  Image, 
  Layers, 
  Mail, 
  Printer, 
  Send, 
  ShieldCheck, 
  Store, 
  Table2, 
  Truck, 
  UserCheck, 
  UserX, 
  Wallet, 
  XCircle 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AttachmentBadgeList, Modal, StatusBadge } from '@/components/common'
import { db } from '@/mocks/db'
import { arDate, downloadAttachment, downloadTextFile, money } from '@/lib/utils'
import { printInvoicePDF, printPackingSlipPDF, printShippingLabelPDF } from '@/lib/pdf-utils'
import { ordersService } from '@/services/orders.service'
import { merchantService } from '@/services/merchant.service'
import { financeService } from '@/services/finance.service'
import { inventoryService } from '@/services/inventory.service'
import { returnsService } from '@/services/returns.service'
import { servicesService } from '@/services/services.service'
import { approvalsService } from '@/services/approvals.service'

type Kind = 'order' | 'merchant' | 'withdrawal' | 'invoice' | 'return' | 'stock-request' | 'service-request' | 'approval'
type DetailConfig = { 
  title: string
  listPath: string
  collection: object[]
  idKey: string
  labels: Record<string, string>
  moneyKeys?: string[]
  dateKeys?: string[]
  statusKeys?: string[] 
}

const PICKERS = ['سعود الفهد', 'ماجد العوفي', 'وليد حسن']

const configs: Record<Kind, DetailConfig> = {
  order: { 
    title: 'تفاصيل الطلب', 
    listPath: '/orders', 
    collection: db.orders, 
    idKey: 'id', 
    labels: { id: 'رقم الطلب', m: 'التاجر', cust: 'العميل', date: 'التاريخ', status: 'الحالة', items: 'عدد المنتجات', total: 'الإجمالي', ship: 'مسؤولية الشحن' }, 
    moneyKeys: ['total'], 
    dateKeys: ['date'], 
    statusKeys: ['status', 'ship'] 
  },
  merchant: { 
    title: 'تفاصيل التاجر', 
    listPath: '/merchants', 
    collection: db.merchants, 
    idKey: 'id', 
    labels: { id: 'المعرف', store: 'المتجر', first: 'الاسم الأول', last: 'الاسم الأخير', email: 'البريد الإلكتروني', phone: 'الجوال', status: 'الحالة', join: 'حالة الانضمام', created: 'تاريخ الإنشاء', bank: 'البنك', iban: 'الآيبان', natAddr: 'العنوان الوطني المختصر', limit: 'حد التخزين', used: 'المستخدم' }, 
    dateKeys: ['created'], 
    statusKeys: ['status', 'join'] 
  },
  withdrawal: { 
    title: 'تفاصيل طلب السحب', 
    listPath: '/finance/withdrawals', 
    collection: db.withdrawals, 
    idKey: 'id', 
    labels: { id: 'رقم الطلب', m: 'التاجر', email: 'البريد الإلكتروني', amount: 'المبلغ', method: 'الطريقة', bank: 'الحساب البنكي', date: 'تاريخ الطلب', status: 'الحالة', notes: 'الملاحظات', attachment: 'المرفقات' }, 
    moneyKeys: ['amount'], 
    dateKeys: ['date'], 
    statusKeys: ['status'] 
  },
  invoice: { 
    title: 'تفاصيل الفاتورة', 
    listPath: '/finance/invoices', 
    collection: db.invoices, 
    idKey: 'ref', 
    labels: { ref: 'مرجع الفاتورة', m: 'التاجر', email: 'البريد الإلكتروني', period: 'فترة الفاتورة', total: 'الإجمالي', status: 'الحالة', due: 'تاريخ الاستحقاق', gen: 'تاريخ الإنشاء', sent: 'تاريخ الإرسال' }, 
    moneyKeys: ['total'], 
    dateKeys: ['due', 'gen', 'sent'], 
    statusKeys: ['status'] 
  },
  return: { 
    title: 'تفاصيل طلب الإرجاع', 
    listPath: '/returns', 
    collection: db.returns, 
    idKey: 'ref', 
    labels: { ref: 'مرجع الإرجاع', order: 'رقم الطلب', m: 'التاجر', cust: 'العميل', email: 'البريد الإلكتروني', count: 'عدد القطع', type: 'نوع الإرجاع', date: 'التاريخ', status: 'الحالة', reason: 'السبب', notes: 'الملاحظات', attachment: 'المرفقات' }, 
    dateKeys: ['date'], 
    statusKeys: ['status'] 
  },
  'stock-request': { 
    title: 'تفاصيل طلب المخزون', 
    listPath: '/inventory/requests', 
    collection: db.stockRequests, 
    idKey: 'id', 
    labels: { id: 'رقم الطلب', m: 'التاجر', p: 'المنتج', wh: 'المستودع', type: 'النوع', qty: 'الكمية', date: 'تاريخ الطلب', status: 'الحالة', notes: 'الملاحظات', attachment: 'المرفقات' }, 
    dateKeys: ['date'], 
    statusKeys: ['status', 'type'] 
  },
  'service-request': { 
    title: 'تفاصيل طلب الخدمة', 
    listPath: '/services/requests', 
    collection: db.serviceRequests, 
    idKey: 'ref', 
    labels: { ref: 'مرجع طلب الخدمة', m: 'التاجر', email: 'البريد الإلكتروني', type: 'نوع الخدمة', prod: 'المنتج', qty: 'الكمية', cost: 'التكلفة', urgency: 'الإلحاح', date: 'التاريخ المفضل', req: 'تاريخ الطلب', status: 'الحالة', notes: 'الملاحظات', attachment: 'المرفقات' }, 
    moneyKeys: ['cost'], 
    dateKeys: ['date', 'req'], 
    statusKeys: ['status', 'urgency'] 
  },
  approval: { 
    title: 'تفاصيل الموافقة', 
    listPath: '/approvals', 
    collection: db.approvals, 
    idKey: 'id', 
    labels: { id: 'المعرف', type: 'النوع', urgency: 'الإلحاح', who: 'مقدم الطلب', title: 'الوصف', date: 'تاريخ الطلب', days: 'أيام التعليق', qty: 'الكمية', sourceRef: 'مرجع المصدر', requestedInfo: 'المعلومات المطلوبة', infoDeadline: 'موعد المعلومات', assignedTo: 'المسند إليه', assignmentReason: 'سبب الإسناد' }, 
    dateKeys: ['date', 'infoDeadline'], 
    statusKeys: ['urgency'] 
  },
}

export default function RecordDetailPage() {
  const navigate = useNavigate()
  const { kind, id } = useParams<{ kind: Kind; id: string }>()
  const config = kind ? configs[kind] : undefined
  const record = config?.collection.find(item => String((item as Record<string, unknown>)[config.idKey]) === id)
  const qc = useQueryClient()

  // Local interaction states
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState(String((record as Record<string, unknown> | undefined)?.status ?? ''))
  const [picker, setPicker] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null)

  // Modals state
  const [carrierModalOpen, setCarrierModalOpen] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState('أرامكس (Aramex)')

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentConfirmNo, setPaymentConfirmNo] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const [limitModalOpen, setLimitModalOpen] = useState(false)
  const [storageLimit, setStorageLimit] = useState(Number((record as Record<string, unknown> | undefined)?.limit ?? 100))

  const [serviceApproveModalOpen, setServiceApproveModalOpen] = useState(false)
  const [serviceCost, setServiceCost] = useState(Number((record as Record<string, unknown> | undefined)?.cost ?? 500))
  const [serviceStaff, setServiceStaff] = useState('مدير العمليات')
  const [serviceDate, setServiceDate] = useState(String((record as Record<string, unknown> | undefined)?.date ?? '2026-03-01'))

  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [infoText, setInfoText] = useState('')
  const [infoDeadline, setInfoDeadline] = useState('2026-03-05')

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignStaff, setAssignStaff] = useState('مشرف العمليات الأول')
  const [assignReason, setAssignReason] = useState('')

  // Mutations
  const assign = useMutation({
    mutationFn: async (selected: string) => {
      if (!config || !record) throw new Error('السجل غير موجود')
      return ordersService.assignPicker(String((record as Record<string, unknown>)[config.idKey]), selected)
    },
    onSuccess: () => { 
      toast.success('تم إسناد الطلب إلى المنتقي بنجاح')
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: error => toast.error((error as Error).message),
  })

  const execute = useMutation({
    mutationFn: async (action: string) => {
      if (!config || !record) throw new Error('السجل غير موجود')
      const data = record as Record<string, unknown>
      const recordId = String(data[config.idKey])

      if (kind === 'order') {
        if (action === 'status') return ordersService.setStatus([recordId], status as never)
        if (action === 'cancel') return ordersService.setStatus([recordId], 'ملغي')
        if (action === 'complete') return ordersService.setStatus([recordId], 'مكتمل')
        if (action === 'ship') return ordersService.setStatus([recordId], 'جاري الشحن')
        if (action === 'process') return ordersService.setStatus([recordId], 'قيد المعالجة')
      }

      if (kind === 'merchant') {
        if (action === 'toggleStatus') return merchantService.setStatus(recordId)
        if (action === 'approveJoin') return merchantService.update(recordId, { join: 'منضم' })
        if (action === 'setLimit') return merchantService.update(recordId, { limit: storageLimit })
        if (action === 'delete') return merchantService.remove(recordId)
      }

      if (kind === 'withdrawal') {
        if (action === 'approve') return financeService.approveWithdrawal(recordId)
        if (action === 'reject') return financeService.rejectWithdrawal(recordId, reason)
        if (action === 'process') return financeService.processPayment(recordId, paymentNotes)
        if (action === 'complete') return financeService.completeWithdrawal(recordId, paymentConfirmNo)
      }

      if (kind === 'invoice') {
        if (action === 'markPaid') return financeService.markPaid(recordId)
        if (action === 'resend') return financeService.resendInvoice(recordId)
        if (action === 'remind') {
          toast.success('تم إرسال تذكير بالسداد للتاجر عبر البريد والإشعارات')
          return
        }
      }

      if (kind === 'stock-request') {
        if (action === 'approve') return inventoryService.approveRequest(recordId)
        if (action === 'reject') return inventoryService.rejectRequest(recordId, reason)
      }

      if (kind === 'return') {
        if (action === 'approve') return returnsService.approve(recordId)
        if (action === 'reject') return returnsService.reject(recordId, reason)
        if (action === 'receive') return returnsService.receive(recordId)
        if (action === 'refund') return returnsService.refund(recordId, 'رصيد المحفظة', Number(data.count) * 180)
      }

      if (kind === 'service-request') {
        if (action === 'approve') return servicesService.approveRequest(recordId, { cost: serviceCost, date: serviceDate, staff: serviceStaff, notes: '' })
        if (action === 'reject') return servicesService.rejectRequest(recordId, reason)
        if (action === 'advance') return servicesService.advanceStatus(recordId)
      }

      if (kind === 'approval') {
        if (action === 'approve') return approvalsService.approve(recordId, {})
        if (action === 'reject') return approvalsService.reject(recordId, { reason, category: 'رفض إداري', resubmit: 'مسموح' })
        if (action === 'requestInfo') return approvalsService.requestInfo(recordId, infoText, infoDeadline)
        if (action === 'assign') return approvalsService.assign(recordId, assignStaff, assignReason)
      }

      throw new Error('الإجراء غير مدعوم')
    },
    onSuccess: () => { 
      toast.success('تم تنفيذ الإجراء وتحديث السجل بنجاح')
      qc.invalidateQueries()
      setPaymentModalOpen(false)
      setLimitModalOpen(false)
      setServiceApproveModalOpen(false)
      setInfoModalOpen(false)
      setAssignModalOpen(false)
      navigate(0)
    },
    onError: error => toast.error((error as Error).message),
  })

  if (!config || !record) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="font-bold">السجل غير موجود أو لم تعد لديك صلاحية للوصول إليه.</p>
        <Button className="mt-4" onClick={() => navigate(config?.listPath ?? '/')}>العودة للقائمة الرئيسية</Button>
      </div>
    )
  }

  const data = record as Record<string, unknown>
  const currentStatus = String(data.status ?? data.join ?? '')

  const sourceAttachments = kind === 'approval' && data.sourceRef ? (() => {
    const ref = String(data.sourceRef)
    if (ref.startsWith('SR-')) { const s = db.stockRequests.find(r => r.id === ref); return s?.attachment ? [s.attachment] : [] }
    if (ref.startsWith('RET-')) { const s = db.returns.find(r => r.ref === ref); return s?.attachment ? [s.attachment] : [] }
    if (ref.startsWith('WD-')) { const s = db.withdrawals.find(r => r.id === ref); return s?.attachment ? [s.attachment] : [] }
    if (ref.startsWith('M-')) { const s = db.merchants.find(r => r.id === ref); return s?.attachments ?? [] }
    if (ref.startsWith('SRV-')) { const s = db.serviceRequests.find(r => r.ref === ref); return s?.attachment ? [s.attachment] : [] }
    return []
  })() : null

  const printSlip = () => {
    if (kind !== 'order') return
    printPackingSlipPDF({
      orderNumber: String(data.id ?? ''),
      customerName: String(data.cust ?? '—'),
      shippingAddress: 'الرياض — المملكة العربية السعودية',
      shippingMethod: String(data.ship === 'منصة' ? 'شحن المنصة' : 'الشحن الذاتي'),
      merchantName: String(data.m ?? '—'),
      items: [
        { name: 'قهوة عربية مختصة 1كجم', sku: 'COF-101', quantity: 2 },
        { name: 'بن محمص كولومبي 500جم', sku: 'COF-202', quantity: 1 },
      ],
      date: arDate(String(data.date ?? '')),
    })
    toast.success('تم تجهيز قائمة التجميع والطباعة (PDF)')
  }

  const doPrintLabel = (carrier: string) => {
    if (kind !== 'order') return
    const shipMethod = String(data.ship ?? '')
    if (shipMethod === 'ذاتي') {
      toast.error('إدارة بوليصة الشحن تتم بواسطة التاجر للطلبات ذاتية الشحن')
      return
    }
    printShippingLabelPDF({
      orderNumber: String(data.id ?? ''),
      customerName: String(data.cust ?? '—'),
      shippingAddress: 'الرياض — المملكة العربية السعودية',
      merchantName: String(data.m ?? '—'),
      trackingNumber: 'TRK-88' + String(data.id ?? '').slice(-4),
      date: arDate(String(data.date ?? '')),
      carrier,
    })
    toast.success(`تم إنشاء بوليصة الشحن عبر (${carrier}) وتنزيلها`)
    setCarrierModalOpen(false)
  }

  const downloadInvoice = () => {
    if (kind !== 'invoice') return
    const invoiceTotal = Number(data.total ?? 0)
    const subtotal = invoiceTotal / 1.15
    const tax = invoiceTotal - subtotal
    printInvoicePDF({
      reference: String(data.ref ?? ''),
      period: String(data.period ?? 'يناير 2026'),
      merchantName: String(data.m ?? '—'),
      merchantEmail: String(data.email ?? 'merchant@daam.sa'),
      items: [
        { description: 'رسوم خدمات التخزين والمناولة الشهرية', quantity: 1, unitPrice: subtotal, total: subtotal },
      ],
      subtotal,
      tax,
      total: invoiceTotal,
      dueDate: String(data.due ?? '2026-02-15'),
      createdAt: String(data.gen ?? '2026-02-01'),
      status: String(data.status ?? 'تم التوليد'),
    })
    toast.success('تم فتح وتجهيز الفاتورة للطباعة والتنزيل (PDF)')
  }

  const entries = Object.entries(config.labels).filter(([key]) => data[key] !== undefined && data[key] !== '')
  const activity = db.logs.filter(log => Object.values(data).some(value => typeof value === 'string' && log.desc.includes(value))).slice(0, 8)
  const attachmentList = (() => {
    const ownRaw = data.attachment ?? data.attachments
    const own: string[] = Array.isArray(ownRaw) ? ownRaw.filter(Boolean) : typeof ownRaw === 'string' ? ownRaw.split(',').map(item => item.trim()).filter(Boolean) : []
    if (sourceAttachments && sourceAttachments.length > 0) return [...new Set([...own, ...sourceAttachments])]
    return own
  })()

  const noteText = typeof data.notes === 'string' ? data.notes.trim() : ''
  const attachmentExtension = (item: string) => item.split('.').pop()?.toLowerCase() ?? ''
  const attachmentKind = (item: string) => {
    const extension = attachmentExtension(item)
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) return 'image'
    if (['txt', 'csv'].includes(extension)) return 'text'
    if (extension === 'pdf') return 'pdf'
    if (['doc', 'docx'].includes(extension)) return 'word'
    if (['xls', 'xlsx'].includes(extension)) return 'sheet'
    return 'file'
  }

  const previewContent = previewAttachment ? `محتوى تجريبي للملف: ${previewAttachment}\n\nتم رفع هذا المستند وربطه بالسجل. سيظهر المحتوى الكامل عند توفر رابط الملف من الخادم.` : ''
  
  const downloadNotes = () => {
    if (!noteText) return
    downloadTextFile('notes-' + String(data[config.idKey]), noteText)
    toast.success('تم تنزيل الملاحظات بنجاح')
  }

  const value = (key: string, raw: unknown) => {
    if (config.moneyKeys?.includes(key)) return money(Number(raw))
    if (config.dateKeys?.includes(key)) return arDate(String(raw))
    if (config.statusKeys?.includes(key)) return <StatusBadge value={String(raw)} />
    return String(raw)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Action Center Workflow for All Modules
  // ─────────────────────────────────────────────────────────────────────────────
  const renderModuleActions = () => {
    const showRejectInput = ['withdrawal', 'stock-request', 'return', 'service-request', 'approval'].includes(kind ?? '') && 
      ['معلق', 'حرج', 'عاجل', 'عادي'].includes(currentStatus)

    return (
      <section className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-sm font-black">مركز الإجراءات والعمليات</h3>
            <p className="text-xs text-muted-foreground">الإجراءات المتاحة لهذا السجل وفقاً لحالته الحالية والصلاحيات الإدارية</p>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            الحالة الحالية: <StatusBadge value={currentStatus} />
          </span>
        </div>

        {/* 1. ORDER ACTIONS */}
        {kind === 'order' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold">تغيير الحالة:</Label>
                <select 
                  className="h-9 rounded-md border bg-background px-3 text-sm font-bold" 
                  value={status} 
                  onChange={e => setStatus(e.target.value)}
                >
                  {['معلق', 'قيد المعالجة', 'جاري الشحن', 'مكتمل', 'ارجاع', 'ملغي'].map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <Button disabled={execute.isPending} onClick={() => execute.mutate('status')}>
                  حفظ الحالة
                </Button>
              </div>

              <div className="flex min-w-[260px] flex-1 items-center gap-2">
                <select 
                  className="h-9 flex-1 rounded-md border bg-background px-3 text-sm font-bold" 
                  value={picker} 
                  onChange={e => setPicker(e.target.value)}
                >
                  <option value="">إسناد إلى منتقي...</option>
                  {PICKERS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                <Button variant="outline" disabled={assign.isPending || !picker} onClick={() => assign.mutate(picker)}>
                  إسناد
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => execute.mutate('process')}>
                <Clock className="size-4" /> نقل إلى قيد المعالجة
              </Button>
              <Button variant="outline" size="sm" onClick={() => execute.mutate('ship')}>
                <Truck className="size-4" /> نقل إلى جاري الشحن
              </Button>
              <Button variant="outline" size="sm" onClick={() => execute.mutate('complete')}>
                <CheckCircle className="size-4" /> تأكيد اكتمال الطلب
              </Button>
              {currentStatus !== 'ملغي' && (
                <Button variant="destructive" size="sm" onClick={() => execute.mutate('cancel')}>
                  <XCircle className="size-4" /> إلغاء الطلب
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 2. MERCHANT ACTIONS */}
        {kind === 'merchant' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant={data.status === 'نشط' ? 'outline' : 'default'}
              disabled={execute.isPending} 
              onClick={() => execute.mutate('toggleStatus')}
            >
              {data.status === 'نشط' ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
              {data.status === 'نشط' ? 'إيقاف حساب التاجر' : 'تفعيل حساب التاجر'}
            </Button>

            {data.join === 'غير منضم بعد' && (
              <Button 
                variant="outline" 
                disabled={execute.isPending} 
                onClick={() => execute.mutate('approveJoin')}
              >
                <ShieldCheck className="size-4" /> اعتماد انضمام التاجر (منضم)
              </Button>
            )}

            <Button variant="outline" onClick={() => setLimitModalOpen(true)}>
              <Layers className="size-4" /> تعديل حد التخزين ({Number(data.limit ?? 100)} م³)
            </Button>

            <Button variant="outline" onClick={() => navigate(`/orders?merchant=${encodeURIComponent(String(data.store ?? ''))}`)}>
              <Store className="size-4" /> عرض طلبات المتجر
            </Button>

            <Button variant="outline" onClick={() => navigate(`/finance/wallets?q=${encodeURIComponent(String(data.store ?? ''))}`)}>
              <Wallet className="size-4" /> عرض محفظة التاجر
            </Button>
          </div>
        )}

        {/* 3. WITHDRAWAL ACTIONS */}
        {kind === 'withdrawal' && (
          <div className="flex flex-wrap items-center gap-2">
            {currentStatus === 'معلق' && (
              <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>
                <CheckCircle className="size-4" /> اعتماد طلب السحب
              </Button>
            )}
            {currentStatus === 'معتمد' && (
              <Button disabled={execute.isPending} onClick={() => setPaymentModalOpen(true)}>
                <Send className="size-4" /> تنفيذ التحويل البنكي
              </Button>
            )}
            {currentStatus === 'قيد التنفيذ' && (
              <Button disabled={execute.isPending} onClick={() => execute.mutate('complete')}>
                <CheckCircle className="size-4" /> تأكيد اكتمال السحب
              </Button>
            )}
          </div>
        )}

        {/* 4. INVOICE ACTIONS */}
        {kind === 'invoice' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={downloadInvoice}>
              <Download className="size-4" /> تنزيل / طباعة الفاتورة (PDF)
            </Button>
            {currentStatus !== 'مدفوعة' && (
              <>
                <Button disabled={execute.isPending} onClick={() => execute.mutate('markPaid')}>
                  <CheckCircle className="size-4" /> تسجيل الفاتورة كمدفوعة
                </Button>
                <Button variant="outline" disabled={execute.isPending} onClick={() => execute.mutate('remind')}>
                  <Mail className="size-4" /> إرسال تذكير بالسداد
                </Button>
              </>
            )}
            <Button variant="outline" disabled={execute.isPending} onClick={() => execute.mutate('resend')}>
              <Send className="size-4" /> إعادة إرسال الفاتورة بالبريد
            </Button>
          </div>
        )}

        {/* 5. RETURN ACTIONS */}
        {kind === 'return' && (
          <div className="flex flex-wrap items-center gap-2">
            {currentStatus === 'معلق' && (
              <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>
                <CheckCircle className="size-4" /> اعتماد طلب الإرجاع
              </Button>
            )}
            {(currentStatus === 'معتمد' || currentStatus === 'في الطريق') && (
              <Button disabled={execute.isPending} onClick={() => execute.mutate('receive')}>
                <Truck className="size-4" /> تأكيد استلام المرتجع في المستودع
              </Button>
            )}
            {currentStatus === 'مستلم' && (
              <Button disabled={execute.isPending} onClick={() => execute.mutate('refund')}>
                <CheckCircle className="size-4" /> تأكيد الفحص وإجراء الاسترداد
              </Button>
            )}
            {currentStatus === 'تم الفحص' && (
              <Button disabled={execute.isPending} onClick={() => execute.mutate('refund')}>
                <Wallet className="size-4" /> معالجة الاسترداد المالي للمحفظة
              </Button>
            )}
          </div>
        )}

        {/* 6. STOCK REQUEST ACTIONS */}
        {kind === 'stock-request' && (
          <div className="flex flex-wrap items-center gap-2">
            {currentStatus === 'معلق' && (
              <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>
                <CheckCircle className="size-4" /> اعتماد طلب المخزون وإدخاله
              </Button>
            )}
            <Button variant="outline" onClick={() => toast.success('تم تعيين المستودع والموقع بنجاح')}>
              <Layers className="size-4" /> تعيين موقع الرف والتخزين
            </Button>
          </div>
        )}

        {/* 7. SERVICE REQUEST ACTIONS */}
        {kind === 'service-request' && (
          <div className="flex flex-wrap items-center gap-2">
            {currentStatus === 'معلق' && (
              <Button disabled={execute.isPending} onClick={() => setServiceApproveModalOpen(true)}>
                <CheckCircle className="size-4" /> اعتماد طلب الخدمة وتحديد التكلفة
              </Button>
            )}
            {['معتمد', 'قيد التنفيذ'].includes(currentStatus) && (
              <Button disabled={execute.isPending} onClick={() => execute.mutate('advance')}>
                <Clock className="size-4" /> تقدم حالة الخدمة ({currentStatus === 'معتمد' ? 'بدء التنفيذ' : 'تأكيد الإنجاز'})
              </Button>
            )}
          </div>
        )}

        {/* 8. APPROVAL ACTIONS */}
        {kind === 'approval' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>
              <CheckCircle className="size-4" /> اعتماد الموافقة فورياً
            </Button>
            <Button variant="outline" onClick={() => setInfoModalOpen(true)}>
              <HelpCircle className="size-4" /> طلب معلومات إضافية
            </Button>
            <Button variant="outline" onClick={() => setAssignModalOpen(true)}>
              <Send className="size-4" /> إسناد لمشرف آخر
            </Button>
          </div>
        )}

        {/* REJECTION REASON INPUT (Common across modules where applicable) */}
        {showRejectInput && (
          <div className="mt-4 max-w-xl border-t pt-3">
            <Label className="mb-2 block text-xs font-bold text-muted-foreground">رفض الطلب مع توثيق السبب الإداري:</Label>
            <div className="flex gap-2">
              <Textarea 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                placeholder="اكتب سبب الرفض بالتفصيل (10 أحرف على الأقل)..." 
                className="text-xs"
              />
            </div>
            <Button 
              className="mt-2" 
              variant="destructive" 
              size="sm"
              disabled={execute.isPending || reason.trim().length < 10} 
              onClick={() => execute.mutate('reject')}
            >
              <XCircle className="size-4" /> رفض الطلب رسمياً
            </Button>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-muted-foreground">{config.title}</p>
          <h2 className="text-xl font-black" dir="ltr">{String(data[config.idKey])}</h2>
        </div>

        {kind === 'order' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={printSlip}>
              <Printer className="size-4" /> قائمة التعبئة
            </Button>
            <Button variant="outline" onClick={() => setCarrierModalOpen(true)}>
              <Truck className="size-4" /> بوليصة الشحن
            </Button>
          </div>
        )}

        {kind === 'invoice' && (
          <Button variant="outline" onClick={downloadInvoice}>
            <Download className="size-4" /> تنزيل الفاتورة (PDF)
          </Button>
        )}
      </div>

      {/* Record Summary */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-black">ملخص السجل</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([key, label]) => (
            <div key={key} className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
              <div className="mt-1 break-words text-sm font-extrabold">{value(key, data[key])}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Notes & Attachments */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-black">الملاحظات والمرفقات</h3>
        <div className="space-y-4">
          {noteText ? (
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-muted-foreground">الملاحظات</p>
                <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={downloadNotes}>
                  <Download className="size-3" /> تنزيل الملاحظات
                </Button>
              </div>
              <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-[13px] font-bold">{noteText}</p>
            </div>
          ) : null}

          {attachmentList.length > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-bold text-muted-foreground">المرفقات</p>
              <AttachmentBadgeList attachments={attachmentList} />
            </div>
          ) : null}

          {!noteText && attachmentList.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد ملاحظات أو مرفقات مرتبطة بهذا السجل.</p>
          )}
        </div>
      </section>

      {/* Dynamic Actions Center */}
      {renderModuleActions()}

      {/* Activity Log */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-black">سجل النشاط</h3>
        {activity.length ? (
          <ol className="space-y-3">
            {activity.map(log => (
              <li key={log.id} className="border-s-2 ps-3">
                <p className="text-sm font-bold">{log.desc}</p>
                <p className="mt-1 text-xs text-muted-foreground">{log.actor} · {log.time}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد عمليات مسجلة لهذا السجل حتى الآن.</p>
        )}
      </section>

      {/* ── ALL MODALS ──────────────────────────────────────────────────────── */}

      {/* Preview Attachment Modal */}
      <Modal 
        open={!!previewAttachment} 
        onClose={() => setPreviewAttachment(null)} 
        title={'معاينة المرفق — ' + (previewAttachment ?? '')} 
        wide 
        footer={<Button variant="outline" onClick={() => setPreviewAttachment(null)}>إغلاق</Button>}
      >
        {previewAttachment && attachmentKind(previewAttachment) === 'image' && /^https?:\/\//.test(previewAttachment) ? (
          <img src={previewAttachment} alt={previewAttachment} className="max-h-[55vh] w-full rounded-lg object-contain" />
        ) : null}
        {previewAttachment && attachmentKind(previewAttachment) === 'text' ? (
          <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm font-semibold">{previewContent}</pre>
        ) : null}
        {previewAttachment && attachmentKind(previewAttachment) !== 'image' && attachmentKind(previewAttachment) !== 'text' && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-xl bg-card shadow-sm">
              {attachmentKind(previewAttachment) === 'sheet' ? <Table2 className="size-8 text-emerald-600" /> : attachmentKind(previewAttachment) === 'word' ? <FileText className="size-8 text-blue-600" /> : attachmentKind(previewAttachment) === 'pdf' ? <FileText className="size-8 text-red-600" /> : <Image className="size-8 text-muted-foreground" />}
            </div>
            <p className="text-sm font-bold">معاينة {attachmentExtension(previewAttachment).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">الملف متاح للعرض بعد ربطه برابط التخزين من الخادم.</p>
          </div>
        )}
      </Modal>

      {/* Carrier Selection Modal for Shipping Label */}
      <Modal
        open={carrierModalOpen}
        onClose={() => setCarrierModalOpen(false)}
        title="اختيار شركة الشحن لطباعة البوليصة"
        footer={
          <>
            <Button variant="outline" onClick={() => setCarrierModalOpen(false)}>إلغاء</Button>
            <Button onClick={() => doPrintLabel(selectedCarrier)}>
              <Truck className="size-4" /> إنشاء وطباعة البوليصة
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-bold text-muted-foreground">شركة الشحن (Carrier)</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedCarrier}
              onChange={e => setSelectedCarrier(e.target.value)}
            >
              {['أرامكس (Aramex)', 'سمسا إكسبريس (SMSA Express)', 'دي إتش إل (DHL Express)', 'فيديكس (FedEx)', 'سبل - البريد السعودي (SPL)', 'ناقل إكسبريس (Naqel)', 'ريد بوكس (RedBox)', 'جي آند تي إكسبريس (J&T Express)'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            سيتم إنشاء بوليصة الشحن الرسمية متضمنة شعار واسم الناقل المختار وتفاصيل المستودع والعميل.
          </p>
        </div>
      </Modal>

      {/* Payment Processing Modal (Withdrawal) */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="تنفيذ التحويل البنكي لطلب السحب"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>إلغاء</Button>
            <Button disabled={execute.isPending} onClick={() => execute.mutate('process')}>
              <CheckCircle className="size-4" /> تأكيد تنفيذ التحويل
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold">المبلغ المطلوب تحويله:</Label>
            <p className="text-lg font-black text-emerald-600">{money(Number(data.amount ?? 0))}</p>
          </div>
          <div>
            <Label className="text-xs font-bold">الحساب البنكي والآيبان:</Label>
            <p className="text-sm font-bold">{String(data.bank ?? '—')}</p>
          </div>
          <div>
            <Label className="text-xs font-bold">ملاحظات التحويل أو الرقم المرجعي للبنك:</Label>
            <Input 
              value={paymentNotes} 
              onChange={e => setPaymentNotes(e.target.value)} 
              placeholder="مثال: حوالة سريعة رقم #TR-998234" 
            />
          </div>
        </div>
      </Modal>

      {/* Storage Limit Modal (Merchant) */}
      <Modal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        title="تعديل حد التخزين المسموح للتاجر"
        footer={
          <>
            <Button variant="outline" onClick={() => setLimitModalOpen(false)}>إلغاء</Button>
            <Button disabled={execute.isPending} onClick={() => execute.mutate('setLimit')}>
              حفظ الحد الجديد
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold">حد التخزين الجديد (بالمتر المكعب m³):</Label>
            <Input 
              type="number" 
              min={1} 
              max={10000} 
              value={storageLimit} 
              onChange={e => setStorageLimit(Number(e.target.value))} 
            />
          </div>
          <p className="text-xs text-muted-foreground">
            الحجم المستخدم حالياً: <b>{String(data.used ?? 0)} م³</b>
          </p>
        </div>
      </Modal>

      {/* Service Request Approval Modal */}
      <Modal
        open={serviceApproveModalOpen}
        onClose={() => setServiceApproveModalOpen(false)}
        title="اعتماد طلب الخدمة وتحديد التكاليف والمشرف"
        footer={
          <>
            <Button variant="outline" onClick={() => setServiceApproveModalOpen(false)}>إلغاء</Button>
            <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>
              اعتماد الطلب
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold">التكلفة الإجمالية المعتمدة (ر.س):</Label>
            <Input 
              type="number" 
              value={serviceCost} 
              onChange={e => setServiceCost(Number(e.target.value))} 
            />
          </div>
          <div>
            <Label className="text-xs font-bold">المشرف المسؤول عن التنفيذ:</Label>
            <Input 
              value={serviceStaff} 
              onChange={e => setServiceStaff(e.target.value)} 
            />
          </div>
          <div>
            <Label className="text-xs font-bold">تاريخ التنفيذ المستهدف:</Label>
            <Input 
              type="date" 
              value={serviceDate} 
              onChange={e => setServiceDate(e.target.value)} 
            />
          </div>
        </div>
      </Modal>

      {/* Request Info Modal (Approval) */}
      <Modal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title="طلب معلومات إضافية للموافقة"
        footer={
          <>
            <Button variant="outline" onClick={() => setInfoModalOpen(false)}>إلغاء</Button>
            <Button disabled={execute.isPending || !infoText.trim()} onClick={() => execute.mutate('requestInfo')}>
              إرسال طلب المعلومات
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold">المعلومات والوثائق المطلوبة من مقدم الطلب:</Label>
            <Textarea 
              value={infoText} 
              onChange={e => setInfoText(e.target.value)} 
              placeholder="اكتب التوضيحات أو المستندات الإضافية المطلوبة..." 
            />
          </div>
          <div>
            <Label className="text-xs font-bold">الموعد النهائي لتقديم المعلومات:</Label>
            <Input 
              type="date" 
              value={infoDeadline} 
              onChange={e => setInfoDeadline(e.target.value)} 
            />
          </div>
        </div>
      </Modal>

      {/* Delegate/Assign Modal (Approval) */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="إسناد الموافقة لمشرف آخر"
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>إلغاء</Button>
            <Button disabled={execute.isPending || !assignReason.trim()} onClick={() => execute.mutate('assign')}>
              إسناد الطلب
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold">المشرف أو المسؤول:</Label>
            <Input 
              value={assignStaff} 
              onChange={e => setAssignStaff(e.target.value)} 
            />
          </div>
          <div>
            <Label className="text-xs font-bold">سبب الإسناد أو التوجيه:</Label>
            <Textarea 
              value={assignReason} 
              onChange={e => setAssignReason(e.target.value)} 
              placeholder="اكتب سبب إسناد هذا الطلب..." 
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
