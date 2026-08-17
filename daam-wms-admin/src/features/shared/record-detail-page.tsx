import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRight, ExternalLink, Printer, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common'
import { db } from '@/mocks/db'
import { arDate, money } from '@/lib/utils'
import { printPackingSlipPDF, printShippingLabelPDF } from '@/lib/pdf-utils'
import { Textarea } from '@/components/ui/textarea'
import { ordersService } from '@/services/orders.service'
import { financeService } from '@/services/finance.service'
import { inventoryService } from '@/services/inventory.service'
import { returnsService } from '@/services/returns.service'
import { servicesService } from '@/services/services.service'

type Kind = 'order' | 'merchant' | 'withdrawal' | 'invoice' | 'return' | 'stock-request' | 'service-request' | 'approval'
type DetailConfig = { title: string; listPath: string; collection: object[]; idKey: string; labels: Record<string, string>; moneyKeys?: string[]; dateKeys?: string[]; statusKeys?: string[] }

const PICKERS = ['سعود الفهد', 'ماجد العوفي', 'وليد حسن']

const configs: Record<Kind, DetailConfig> = {
  order: { title: 'تفاصيل الطلب', listPath: '/orders', collection: db.orders, idKey: 'id', labels: { id: 'رقم الطلب', m: 'التاجر', cust: 'العميل', date: 'التاريخ', status: 'الحالة', items: 'عدد المنتجات', total: 'الإجمالي', ship: 'مسؤولية الشحن' }, moneyKeys: ['total'], dateKeys: ['date'], statusKeys: ['status', 'ship'] },
  merchant: { title: 'تفاصيل التاجر', listPath: '/merchants', collection: db.merchants, idKey: 'id', labels: { id: 'المعرف', store: 'المتجر', first: 'الاسم الأول', last: 'الاسم الأخير', email: 'البريد الإلكتروني', phone: 'الجوال', status: 'الحالة', join: 'حالة الانضمام', created: 'تاريخ الإنشاء', bank: 'البنك', iban: 'الآيبان', natAddr: 'العنوان الوطني المختصر', limit: 'حد التخزين', used: 'المستخدم' }, dateKeys: ['created'], statusKeys: ['status', 'join'] },
  withdrawal: { title: 'تفاصيل طلب السحب', listPath: '/finance/withdrawals', collection: db.withdrawals, idKey: 'id', labels: { id: 'رقم الطلب', m: 'التاجر', email: 'البريد الإلكتروني', amount: 'المبلغ', method: 'الطريقة', bank: 'الحساب البنكي', date: 'تاريخ الطلب', status: 'الحالة', notes: 'الملاحظات', attachment: 'المرفقات' }, moneyKeys: ['amount'], dateKeys: ['date'], statusKeys: ['status'] },
  invoice: { title: 'تفاصيل الفاتورة', listPath: '/finance/invoices', collection: db.invoices, idKey: 'ref', labels: { ref: 'مرجع الفاتورة', m: 'التاجر', email: 'البريد الإلكتروني', period: 'فترة الفاتورة', total: 'الإجمالي', status: 'الحالة', due: 'تاريخ الاستحقاق', gen: 'تاريخ الإنشاء', sent: 'تاريخ الإرسال' }, moneyKeys: ['total'], dateKeys: ['due', 'gen', 'sent'], statusKeys: ['status'] },
  return: { title: 'تفاصيل طلب الإرجاع', listPath: '/returns', collection: db.returns, idKey: 'ref', labels: { ref: 'مرجع الإرجاع', order: 'رقم الطلب', m: 'التاجر', cust: 'العميل', email: 'البريد الإلكتروني', count: 'عدد القطع', type: 'نوع الإرجاع', date: 'التاريخ', status: 'الحالة', reason: 'السبب', notes: 'الملاحظات', attachment: 'المرفقات' }, dateKeys: ['date'], statusKeys: ['status'] },
  'stock-request': { title: 'تفاصيل طلب المخزون', listPath: '/inventory/requests', collection: db.stockRequests, idKey: 'id', labels: { id: 'رقم الطلب', m: 'التاجر', p: 'المنتج', wh: 'المستودع', type: 'النوع', qty: 'الكمية', date: 'تاريخ الطلب', status: 'الحالة', notes: 'الملاحظات', attachment: 'المرفقات' }, dateKeys: ['date'], statusKeys: ['status', 'type'] },
  'service-request': { title: 'تفاصيل طلب الخدمة', listPath: '/services/requests', collection: db.serviceRequests, idKey: 'ref', labels: { ref: 'مرجع طلب الخدمة', m: 'التاجر', email: 'البريد الإلكتروني', type: 'نوع الخدمة', prod: 'المنتج', qty: 'الكمية', cost: 'التكلفة', urgency: 'الإلحاح', date: 'التاريخ المفضل', req: 'تاريخ الطلب', status: 'الحالة', notes: 'الملاحظات', attachment: 'المرفقات' }, moneyKeys: ['cost'], dateKeys: ['date', 'req'], statusKeys: ['status', 'urgency'] },
  approval: { title: 'تفاصيل الموافقة', listPath: '/approvals', collection: db.approvals, idKey: 'id', labels: { id: 'المعرف', type: 'النوع', urgency: 'الإلحاح', who: 'مقدم الطلب', title: 'الوصف', date: 'تاريخ الطلب', days: 'أيام التعليق', qty: 'الكمية', sourceRef: 'مرجع المصدر', requestedInfo: 'المعلومات المطلوبة', infoDeadline: 'موعد المعلومات', assignedTo: 'المسند إليه', assignmentReason: 'سبب الإسناد' }, dateKeys: ['date', 'infoDeadline'], statusKeys: ['urgency'] },
}

export default function RecordDetailPage() {
  const navigate = useNavigate()
  const { kind, id } = useParams<{ kind: Kind; id: string }>()
  const config = kind ? configs[kind] : undefined
  const record = config?.collection.find(item => String((item as Record<string, unknown>)[config.idKey]) === id)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState(String((record as Record<string, unknown> | undefined)?.status ?? ''))
  const [picker, setPicker] = useState('')
  const qc = useQueryClient()
  const assign = useMutation({
    mutationFn: async (selected: string) => {
      if (!config || !record) throw new Error('السجل غير موجود')
      return ordersService.assignPicker(String((record as Record<string, unknown>)[config.idKey]), selected)
    },
    onSuccess: () => { toast.success('تم إسناد الطلب إلى المنتقي بنجاح'); qc.invalidateQueries({ queryKey: ['orders'] }); },
    onError: error => toast.error((error as Error).message),
  })
  const execute = useMutation({
    mutationFn: async (action: string) => {
      if (!config || !record) throw new Error('السجل غير موجود')
      const data = record as Record<string, unknown>
      const recordId = String(data[config.idKey])
      if (kind === 'order') return ordersService.setStatus([recordId], status as never)
      if (kind === 'withdrawal') {
        if (action === 'approve') return financeService.approveWithdrawal(recordId)
        if (action === 'reject') return financeService.rejectWithdrawal(recordId, reason)
        if (action === 'process') return financeService.processPayment(recordId, '')
        return financeService.completeWithdrawal(recordId, '')
      }
      if (kind === 'stock-request') return action === 'approve' ? inventoryService.approveRequest(recordId) : inventoryService.rejectRequest(recordId, reason)
      if (kind === 'return') {
        if (action === 'approve') return returnsService.approve(recordId)
        if (action === 'reject') return returnsService.reject(recordId, reason)
        if (action === 'receive') return returnsService.receive(recordId)
        return returnsService.refund(recordId, 'رصيد المحفظة', Number(data.count) * 180)
      }
      if (kind === 'service-request') return action === 'approve' ? servicesService.approveRequest(recordId, { cost: Number(data.cost), date: String(data.date), staff: 'مدير النظام', notes: '' }) : action === 'reject' ? servicesService.rejectRequest(recordId, reason) : servicesService.advanceStatus(recordId)
      throw new Error('الإجراء غير مدعوم')
    },
    onSuccess: () => { toast.success('تم تنفيذ الإجراء بنجاح'); qc.invalidateQueries(); navigate(0) },
    onError: error => toast.error((error as Error).message),
  })
  if (!config || !record) return <div className="rounded-xl border bg-card p-8 text-center"><p className="font-bold">السجل غير موجود أو لم تعد لديك صلاحية للوصول إليه.</p><Button className="mt-4" onClick={() => navigate(config?.listPath ?? '/')}>العودة للقائمة</Button></div>

  const data = record as Record<string, unknown>
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
  const printLabel = () => {
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
    })
    toast.success('تم إنشاء بوليصة الشحن (PDF) وتنزيلها')
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
  const value = (key: string, raw: unknown) => {
    if (config.moneyKeys?.includes(key)) return money(Number(raw))
    if (config.dateKeys?.includes(key)) return arDate(String(raw))
    if (config.statusKeys?.includes(key)) return <StatusBadge value={String(raw)} />
    return String(raw)
  }
  const workflow = () => {
    const current = String(data.status ?? '')
    if (!['order', 'withdrawal', 'stock-request', 'return', 'service-request'].includes(kind ?? '')) return null
    const reject = ['withdrawal', 'stock-request', 'return', 'service-request'].includes(kind ?? '') && (current === 'معلق')
    return <section className="rounded-xl border bg-card p-5 shadow-sm"><h3 className="mb-4 text-sm font-black">الإجراء</h3><div className="flex flex-wrap gap-2">
      {kind === 'order' && <><select className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={e => setStatus(e.target.value)}>{['معلق', 'قيد المعالجة', 'جاري الشحن', 'مكتمل', 'ارجاع', 'ملغي'].map(option => <option key={option}>{option}</option>)}</select><Button disabled={execute.isPending} onClick={() => execute.mutate('status')}>حفظ الحالة</Button></>}
      {kind === 'order' && <div className="flex min-w-[240px] flex-1 items-center gap-2"><select className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" value={picker} onChange={e => setPicker(e.target.value)}><option value="">اختر المنتقي...</option>{PICKERS.map(option => <option key={option} value={option}>{option}</option>)}</select><Button variant="outline" disabled={assign.isPending || !picker} onClick={() => assign.mutate(picker)}>إسناد</Button></div>}
      {kind === 'withdrawal' && current === 'معلق' && <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>اعتماد الطلب</Button>}
      {kind === 'withdrawal' && current === 'معتمد' && <Button disabled={execute.isPending} onClick={() => execute.mutate('process')}>تنفيذ الدفع</Button>}
      {kind === 'withdrawal' && current === 'قيد التنفيذ' && <Button disabled={execute.isPending} onClick={() => execute.mutate('complete')}>تأكيد الاكتمال</Button>}
      {kind === 'stock-request' && current === 'معلق' && <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>اعتماد الطلب</Button>}
      {kind === 'return' && current === 'معلق' && <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>اعتماد الطلب</Button>}
      {kind === 'return' && current === 'في الطريق' && <Button disabled={execute.isPending} onClick={() => execute.mutate('receive')}>تأكيد الاستلام</Button>}
      {kind === 'return' && current === 'تم الفحص' && <Button disabled={execute.isPending} onClick={() => execute.mutate('refund')}>معالجة الاسترداد</Button>}
      {kind === 'service-request' && current === 'معلق' && <Button disabled={execute.isPending} onClick={() => execute.mutate('approve')}>اعتماد الطلب</Button>}
      {kind === 'service-request' && ['معتمد', 'قيد التنفيذ'].includes(current) && <Button disabled={execute.isPending} onClick={() => execute.mutate('advance')}>تحديث الحالة</Button>}
    </div>{reject && <div className="mt-4 max-w-xl"><label className="mb-2 block text-sm font-bold">سبب الرفض</label><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="اشرح سبب الرفض..." /><Button className="mt-2" variant="destructive" disabled={execute.isPending || reason.trim().length < 10} onClick={() => execute.mutate('reject')}>رفض الطلب</Button></div>}</section>
  }
  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => navigate(config.listPath)}><ArrowRight className="size-4" /> العودة للقائمة</Button><div><p className="text-xs font-bold text-muted-foreground">{config.title}</p><h2 className="text-xl font-black" dir="ltr">{String(data[config.idKey])}</h2></div></div>
      {kind === 'order' && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={printSlip}><Printer className="size-4" /> قائمة التعبئة</Button>
          <Button variant="outline" onClick={printLabel}><Truck className="size-4" /> بوليصة الشحن</Button>
        </div>
      )}
    </div>
    <section className="rounded-xl border bg-card p-5 shadow-sm"><h3 className="mb-4 text-sm font-black">ملخص السجل</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entries.map(([key, label]) => <div key={key} className="rounded-lg border bg-muted/30 p-3"><p className="text-[11px] font-bold text-muted-foreground">{label}</p><div className="mt-1 break-words text-sm font-extrabold">{value(key, data[key])}</div></div>)}</div></section>
    {(noteText || attachmentList.length > 0) && (
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-black">الملاحظات والمرفقات</h3>
        <div className="space-y-4">
          {noteText ? <div><p className="mb-1 text-[11px] font-bold text-muted-foreground">الملاحظات</p><p className="rounded-lg border bg-muted/40 p-3 text-[13px] font-bold">{noteText}</p></div> : null}
          {attachmentList.length > 0 ? <div><p className="mb-1 text-[11px] font-bold text-muted-foreground">المرفقات</p><div className="flex flex-wrap gap-2">{attachmentList.map(item => <div key={item} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1"><span className="text-[11px] font-bold text-blue-600">📎 {item}</span><Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => toast.success('تم تحميل المرفق: ' + item)}>تحميل</Button></div>)}</div></div> : null}
          {!noteText && attachmentList.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ملاحظات أو مرفقات مرتبطة بهذا السجل.</p>}
        </div>
      </section>
    )}
    {workflow()}
    <section className="rounded-xl border bg-card p-5 shadow-sm"><h3 className="mb-4 text-sm font-black">سجل النشاط</h3>{activity.length ? <ol className="space-y-3">{activity.map(log => <li key={log.id} className="border-s-2 ps-3"><p className="text-sm font-bold">{log.desc}</p><p className="mt-1 text-xs text-muted-foreground">{log.actor} · {log.time}</p></li>)}</ol> : <p className="text-sm text-muted-foreground">لا توجد عمليات مسجلة لهذا السجل حتى الآن.</p>}</section>
    <div className="flex justify-end"><Button onClick={() => navigate(config.listPath)}><ExternalLink className="size-4" /> العودة إلى النتائج</Button></div>
  </div>
}
