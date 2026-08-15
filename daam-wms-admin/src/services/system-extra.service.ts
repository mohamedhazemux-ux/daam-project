import { db } from '@/mocks/db'
import { delay } from './http'
import { audit } from './audit.service'
import { todayISO } from '@/lib/utils'
export interface EmailTemplate { id: string; name: string; type: string; event: string; subject: string; body: string; status: 'نشط' | 'غير نشط' }
export const EVENTS: { name: string; vars: string[] }[] = [
  { name: 'تحديث حالة الطلب', vars: ['[merchant_full_name]', '[order_reference]', '[order_status]', '[platform_name]'] },
  { name: 'طلب المخزون معتمد', vars: ['[merchant_full_name]', '[request_reference]', '[product_name]', '[platform_name]'] },
  { name: 'طلب المرتجع مرفوض', vars: ['[merchant_full_name]', '[return_reference]', '[rejection_reason]', '[platform_name]'] },
  { name: 'السحب معتمد', vars: ['[merchant_full_name]', '[withdrawal_reference]', '[amount]', '[platform_name]'] },
  { name: 'طلب الخدمة مكتمل', vars: ['[merchant_full_name]', '[service_reference]', '[platform_name]'] },
  { name: 'إشعار الفاتورة', vars: ['[merchant_full_name]', '[invoice_reference]', '[invoice_period]', '[total_amount_due]', '[due_date]', '[platform_name]'] },
]
const TEMPLATES: EmailTemplate[] = [
  { id: 'TPL-01', name: 'قالب تحديث حالة الطلب', type: 'تحديث طلب', event: 'تحديث حالة الطلب', subject: 'تحديث حالة الطلب [order_reference]', body: 'مرحباً [merchant_full_name]، تم تحديث حالة طلبك [order_reference] إلى [order_status]. — [platform_name]', status: 'نشط' },
  { id: 'TPL-02', name: 'قالب إشعار الفاتورة', type: 'إشعار الفاتورة', event: 'إشعار الفاتورة', subject: 'فاتورتك الشهرية [invoice_period] [invoice_reference]', body: 'مرحباً [merchant_full_name]، صدرت فاتورتك [invoice_reference] عن فترة [invoice_period] بمبلغ [total_amount_due]، تستحق في [due_date]. — [platform_name]', status: 'نشط' },
]
let tplSeq = 2
export const systemExtraService = {
  async templates() { await delay(150); return [...TEMPLATES] },
  events: () => EVENTS,
  async saveTemplate(input: Omit<EmailTemplate, 'id'>, id?: string) {
    await delay(300)
    const ev = EVENTS.find(e => e.name === input.event)
    if (!ev) throw new Error('الحدث الإشعاري مطلوب')
    for (const v of ev.vars) if (!input.body.includes(v)) throw new Error('القالب يفتقر إلى المتغير المطلوب [' + v.replace(/[[\]]/g, '') + ']')
    if (input.status === 'نشط' && TEMPLATES.some(t => t.id !== id && t.status === 'نشط' && t.event === input.event)) throw new Error('قالب آخر مرتبط بالفعل بهذا الحدث الإشعاري')
    if (id) Object.assign(TEMPLATES.find(t => t.id === id)!, input)
    else TEMPLATES.push({ id: 'TPL-' + String(++tplSeq).padStart(2, '0'), ...input })
    audit('حفظ قالب بريد: ' + input.name + ' — الحدث المرتبط: ' + input.event, 'قوالب البريد', id ? 'تعديل' : 'إنشاء')
  },
  async runBillingCycle() {
    await delay(600)
    let ok = 0, fail = 0, collected = 0
    db.subscriptions.forEach(s => {
      if (s.status !== 'نشط') return
      const w = db.wallets.find(x => x.m === s.m)
      if (!w) return
      if (w.bal >= s.cost) { w.bal -= s.cost; s.total += s.cost; collected += s.cost; ok++; const d = new Date(); d.setDate(d.getDate() + (s.freq === 'أسبوعي' ? 7 : s.freq === 'شهري' ? 30 : s.freq === 'ربع سنوي' ? 90 : 365)); s.next = d.toISOString().slice(0, 10) }
      else { s.status = 'فشل الدفع'; fail++ }
    })
    audit('تشغيل دورة الفوترة المتكررة يدويًا — معالج: ' + (ok + fail) + ' | ناجح: ' + ok + ' | فاشل: ' + fail + ' | محصل: ' + collected, 'الفوترة المتكررة')
    return { processed: ok + fail, ok, fail, collected }
  },
  async generateMonthlyInvoices() {
    await delay(700)
    const period = 'يناير 2026'
    let count = 0, total = 0
    db.merchants.filter(m => m.status === 'نشط').forEach(m => {
      const letter = (m.store.trim()[0] ?? 'M').toUpperCase()
      const amount = 1000 + Math.round(m.used * 2)
      db.invoices.unshift({ ref: 'INV-' + letter + '-202601-' + String(++count).padStart(3, '0'), m: m.store, period, total: amount, status: 'تم الإرسال', due: '2026-02-15', gen: todayISO(), sent: todayISO() } as (typeof db.invoices)[0])
      total += amount
    })
    audit('توليد الفواتير الشهرية يدويًا — عدد الفواتير: ' + count + ' — إجمالي المفوتر: ' + total, 'الفواتير الشهرية', 'إنشاء')
    return { count, total, sent: count, failed: 0 }
  },
  async integrations() {
    await delay(150)
    return [
      { name: 'Shipping provider', type: 'Shipping', provider: 'Demo', url: 'https://api.example.com/shipping', health: 'يعمل', sync: 'Every 15 minutes' },
      { name: 'Payment provider', type: 'Payments', provider: 'Demo', url: 'https://api.example.com/payments', health: 'يعمل', sync: 'Every 5 minutes' },
    ]
  },
}
