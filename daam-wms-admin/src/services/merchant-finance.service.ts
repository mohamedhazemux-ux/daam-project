import { db } from '@/mocks/db'
import { delay, paginate } from './http'
import { audit } from './audit.service'
import { todayISO } from '@/lib/utils'
import type { ListQuery, ListResult } from '@/types'
export interface Tx { id: string; m: string; type: 'إيداع' | 'خصم' | 'استرداد' | 'سحب' | 'تعديل'; desc: string; orderRef?: string; returnRef?: string; amount: number; running: number; status: 'مكتمل' | 'معلق' | 'فشل'; date: string; notes?: string; by?: string }
const seedTx = (): Tx[] => {
  const s = db.merchants[0]?.store ?? ''
  let run = 1200
  const mk = (i: number, type: Tx['type'], desc: string, amount: number, status: Tx['status'], date: string, extra?: Partial<Tx>) => { run += type === 'إيداع' || type === 'استرداد' ? amount : -amount; return { id: 'TX-' + (1000 + i), m: s, type, desc, amount, running: run, status, date, ...extra } }
  return [
    mk(1, 'إيداع', 'تحصيل قيمة الطلب ORD-903', 225, 'مكتمل', '2026-01-14', { orderRef: 'ORD-903' }),
    mk(2, 'خصم', 'رسوم تنفيذ طلبات يناير', 60, 'مكتمل', '2026-01-15'),
    mk(3, 'سحب', 'طلب سحب WD-3001', 500, 'معلق', '2026-01-16'),
    mk(4, 'استرداد', 'استرداد مرتجع', 180, 'مكتمل', '2026-01-17', { returnRef: 'RET-M-001' }),
    mk(5, 'تعديل', 'تعديل يدوي بواسطة الإدارة', 50, 'مكتمل', '2026-01-18', { by: 'منى المطيري' }),
    mk(6, 'خصم', 'رسوم خدمة متكررة — تخزين موسع', 120, 'فشل', '2026-01-19'),
  ]
}
export const TXS: Tx[] = seedTx()
let wdSeq = 4000
export const merchantFinanceService = {
  async wallet(store: string) {
    await delay(150)
    const w = db.wallets.find(x => x.m === store)
    if (!w) throw new Error('المحفظة غير موجودة')
    return { bal: w.bal, credits: w.credits, debits: w.debits, pending: 250, res: w.res, avail: w.bal - w.res }
  },
  async transactions(q: ListQuery & { store: string }): Promise<ListResult<Tx>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const type = q.type as string
    const status = q.status as string
    const from = q.from as string
    const to = q.to as string
    const minA = +(q.minA ?? 0)
    const maxA = +(q.maxA ?? 0)
    const rows = TXS.filter(x => x.m === q.store &&
      (!t || x.id.toLowerCase().includes(t) || x.desc.toLowerCase().includes(t) || (x.orderRef ?? '').toLowerCase().includes(t) || (x.returnRef ?? '').toLowerCase().includes(t)) &&
      (!type || x.type === type) && (!status || x.status === status) &&
      (!from || x.date >= from) && (!to || x.date <= to) &&
      (!minA || x.amount >= minA) && (!maxA || x.amount <= maxA))
    return paginate(rows, q)
  },
  async txDetails(id: string) {
    await delay(150)
    const x = TXS.find(v => v.id === id)
    if (!x) throw new Error('المعاملة غير موجودة')
    return x
  },
  async bankAccounts(store: string) {
    await delay(100)
    const m = db.merchants.find(x => x.store === store) as (typeof db.merchants)[0] & Record<string, unknown>
    if (!m?.bank) return []
    return [{ id: 'BA-1', label: (m.bank as string) + ' — ****' + (m.iban as string)?.slice(-4), bank: m.bank as string, holder: m.first + ' ' + m.last, iban: m.iban as string, masked: '****' + (m.iban as string)?.slice(-4) }]
  },
  async submitWithdrawal(store: string, email: string, input: { amount: number; account: string; notes: string; attachments?: string[] }) {
    await delay(400)
    const w = db.wallets.find(x => x.m === store)
    if (!w) throw new Error('المحفظة غير موجودة')
    w.res += input.amount
    const id = 'WD-' + ++wdSeq
    const attachment = input.attachments?.length ? input.attachments.join(', ') : undefined
    db.withdrawals.unshift({ id, m: store, email, amount: input.amount, method: 'تحويل بنكي', bank: input.account, date: todayISO(), status: 'معلق', notes: input.notes, attachment } as (typeof db.withdrawals)[0])
    db.approvals.unshift({ id: 'APR-' + (500 + db.approvals.length + 1), type: 'طلب سحب مالي', who: store, title: 'طلب سحب ' + input.amount + ' ريال (' + id + ')', urgency: 'عادي', date: todayISO(), days: 0, sourceRef: id })
    audit('طلب سحب مالي ' + id + ' بمبلغ ' + input.amount + ' — تم حجز المبلغ من الرصيد المتاح', 'مالية التاجر', 'إنشاء')
    return id
  },
  async withdrawals(q: ListQuery & { store: string }): Promise<ListResult<(typeof db.withdrawals)[0]>> {
    await delay()
    const t = String(q.q ?? '').trim().toLowerCase()
    const status = q.status as string
    const rows = db.withdrawals.filter(x => x.m === q.store && (!t || x.id.toLowerCase().includes(t)) && (!status || x.status === status))
    return paginate(rows, q)
  },
  async cancelWithdrawal(id: string) {
    await delay(300)
    const x = db.withdrawals.find(v => v.id === id)
    if (!x) throw new Error('طلب السحب غير موجود')
    if (x.status !== 'معلق') throw new Error('يمكن إلغاء طلبات السحب المعلقة فقط')
    x.status = 'ملغي'
    const w = db.wallets.find(v => v.m === x.m)
    if (w) w.res = Math.max(0, w.res - x.amount)
    db.approvals = db.approvals.filter(a => a.sourceRef !== id)
    audit('إلغاء طلب السحب ' + id + ' — تم تحرير المبلغ المحجوز', 'مالية التاجر', 'تعديل')
  },
  async subscriptions(q: ListQuery & { store: string }): Promise<ListResult<(typeof db.subscriptions)[0]>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const status = q.status as string
    const rows = db.subscriptions.filter(x => x.m === q.store && (!t || x.id.includes(t) || x.type.includes(t)) && (!status || x.status === status))
    return paginate(rows, q)
  },
  async cancelSubscription(id: string) {
    await delay(300)
    const x = db.subscriptions.find(v => v.id === id)
    if (!x) throw new Error('الاشتراك غير موجود')
    x.status = 'ملغي'
    audit('إلغاء الاشتراك ' + id + ' (' + x.type + ') بواسطة التاجر', 'مالية التاجر', 'تعديل')
  },
  async invoices(q: ListQuery & { store: string }): Promise<ListResult<(typeof db.invoices)[0]>> {
    await delay()
    const t = String(q.q ?? '').trim()
    const status = q.status as string
    const period = q.period as string
    const rows = db.invoices.filter(x => x.m === q.store && (!t || x.ref.includes(t)) && (!status || x.status === status) && (!period || x.period === period))
    return paginate(rows, q)
  },
  async invoiceDetails(ref: string) {
    await delay(200)
    const x = db.invoices.find(v => v.ref === ref)
    if (!x) throw new Error('الفاتورة غير موجودة')
    if (x.status === 'تم الإرسال') x.status = 'تم العرض'
    const items = [
      { d: 'رسوم تنفيذ الطلبات', q: 24, u: x.total * 0.5 / 24 },
      { d: 'رسوم الخدمات (دفعة واحدة + متكررة)', q: 3, u: x.total * 0.3 / 3 },
      { d: 'تكاليف شحن المنصة', q: 12, u: x.total * 0.14 / 12 },
    ]
    return { ...x, items, subtotal: x.total / 1.15, tax: x.total - x.total / 1.15 }
  },
}
