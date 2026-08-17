import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { todayISO } from '@/lib/utils'
import type { Invoice, ListQuery, ListResult, Wallet, Withdrawal } from '@/types'

let pmtSeq = 1

export const financeService = {
  async withdrawals(q: ListQuery): Promise<ListResult<Withdrawal>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const status = q.status as string
    const rows = db.withdrawals.filter(w => (!t || w.id.includes(t) || w.m.includes(t)) && (!status || w.status === status))
    return paginate(rows, q)
  },
  async approveWithdrawal(id: string) {
    await delay(300)
    const w = db.withdrawals.find(x => x.id === id)
    if (!w) throw new Error('طلب السحب غير موجود')
    if (w.status !== 'معلق') throw new Error('يجب أن يكون طلب السحب بحالة "معلق" للاعتماد')
    w.status = 'معتمد'
    db.approvals = db.approvals.filter(a => a.sourceRef !== id)
    audit('اعتماد طلب السحب ' + id + ' بمبلغ ' + w.amount, 'مالية', 'اعتماد')
  },
  async rejectWithdrawal(id: string, reason: string) {
    await delay(300)
    const w = db.withdrawals.find(x => x.id === id)
    if (!w) throw new Error('طلب السحب غير موجود')
    w.status = 'مرفوض'
    const wallet = db.wallets.find(x => x.m === w.m)
    if (wallet) wallet.res = Math.max(0, wallet.res - w.amount)
    db.approvals = db.approvals.filter(a => a.sourceRef !== id)
    audit('رفض طلب السحب ' + id + ' — السبب: ' + reason + ' — إعادة المبلغ المحجوز للرصيد المتاح', 'مالية', 'رفض')
  },
  async processPayment(id: string, notes: string) {
    await delay(400)
    const w = db.withdrawals.find(x => x.id === id)
    if (!w) throw new Error('طلب السحب غير موجود')
    if (w.status !== 'معتمد') throw new Error('يجب أن يكون طلب السحب بحالة "معتمد" لتنفيذ الدفع')
    w.status = 'قيد التنفيذ'
    const ref = 'PMT-' + String(pmtSeq++).padStart(3, '0')
    audit('تنفيذ دفع السحب ' + id + ' بمبلغ ' + w.amount + ' — مرجع العملية: ' + ref + (notes ? ' — ملاحظات: ' + notes : ''), 'مالية')
    return ref
  },
  async completeWithdrawal(id: string, confirmNo: string) {
    await delay(300)
    const w = db.withdrawals.find(x => x.id === id)
    if (!w) throw new Error('طلب السحب غير موجود')
    if (w.status !== 'قيد التنفيذ') throw new Error('يجب أن يكون طلب السحب بحالة "قيد التنفيذ" لتأكيد الاكتمال')
    w.status = 'مكتمل'
    const wallet = db.wallets.find(x => x.m === w.m)
    if (wallet) { wallet.bal -= w.amount; wallet.res = Math.max(0, wallet.res - w.amount); wallet.last = todayISO() }
    audit('تأكيد اكتمال السحب ' + id + ' — مرجع العملية موجود' + (confirmNo ? ' — رقم تأكيد التحويل: ' + confirmNo : ''), 'مالية')
  },
  async wallets(q: ListQuery): Promise<ListResult<Wallet>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const status = q.status as string
    const rows = db.wallets.filter(w => (!t || w.m.includes(t) || w.email.includes(t)) && (!status || w.status === status))
    return paginate(rows, q)
  },
  async adjustWallet(m: string, type: 'credit' | 'debit', amount: number, reason: string, notes: string) {
    await delay(400)
    const w = db.wallets.find(x => x.m === m)
    if (!w) throw new Error('المحفظة غير موجودة')
    const prev = w.bal
    w.bal = type === 'credit' ? w.bal + amount : w.bal - amount
    w.last = todayISO()
    audit('تعديل يدوي لمحفظة ' + m + ' (' + (type === 'credit' ? 'إيداع' : 'خصم') + ' ' + amount + ') — قبل: ' + prev + ' — بعد: ' + w.bal + ' — السبب: ' + reason + (notes ? ' — ملاحظات: ' + notes : ''), 'مالية', 'تعديل')
    return w.bal
  },
  async invoices(q: ListQuery): Promise<ListResult<Invoice>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const status = q.status as string
    const rows = db.invoices.filter(i => (!t || i.ref.includes(t) || i.m.includes(t)) && (!status || i.status === status))
    return paginate(rows, q)
  },
  async resendInvoice(ref: string) {
    await delay(300)
    const i = db.invoices.find(x => x.ref === ref)
    if (!i) throw new Error('الفاتورة غير موجودة')
    i.status = 'مرسلة'
    i.sent = todayISO()
    audit('إعادة إرسال الفاتورة ' + ref + ' إلى ' + i.email, 'مالية')
  },
  async markPaid(ref: string) {
    await delay(300)
    const i = db.invoices.find(x => x.ref === ref)
    if (!i) throw new Error('الفاتورة غير موجودة')
    i.status = 'مدفوعة'
    audit('تحديد الفاتورة ' + ref + ' كمدفوعة', 'مالية', 'تعديل')
  },
}
