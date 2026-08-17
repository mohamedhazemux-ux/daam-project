import { db } from '@/mocks/db'
import { delay } from './http'

type OrderRecord = (typeof db.orders)[number]
type StockRequestRecord = (typeof db.stockRequests)[number]
type ReturnRecord = (typeof db.returns)[number]
type WithdrawalRecord = (typeof db.withdrawals)[number]

type ServiceRequestRecord = { status: string }

export const adminDashboardService = {
  async stats() {
    await delay(200)
    const n = <T>(arr: T[], predicate: (item: T) => boolean) => arr.filter(predicate).length
    return {
      merchants: db.merchants.length,
      ordersPending: n(db.orders, (o: OrderRecord) => o.status === 'معلق'),
      ordersTotal: db.orders.length,
      stockPending: n(db.stockRequests, (r: StockRequestRecord) => r.status === 'معلق'),
      returnsPending: n(db.returns, (r: ReturnRecord) => r.status === 'معلق'),
      wdPending: n(db.withdrawals, (w: WithdrawalRecord) => w.status === 'معلق'),
      srvPending: n((db as { serviceRequests?: ServiceRequestRecord[] }).serviceRequests ?? [], (r: ServiceRequestRecord) => r.status === 'معلق'),
      approvals: db.approvals.length,
      revenue: db.wallets.reduce((s, w) => s + w.bal, 0),
      trend: [6, 8, 7, 10, 9, 12, 10, 13, 11, 14, 12, 15, 13, 16, 14, 17, 15, 18, 16, 19, 17, 20, 18, 21, 19, 22, 20, 23, 21, 24],
      topMerchants: db.wallets.slice().sort((a, b) => b.credits - a.credits).slice(0, 5).map(w => [w.m, w.credits] as [string, number]),
    }
  },
}
