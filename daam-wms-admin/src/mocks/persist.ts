import { db } from './db'
import { merchantProducts } from '@/services/merchant-products.service'
import { merchantOrders } from '@/services/merchant-orders.service'
import { merchantReturns } from '@/services/merchant-returns.service'
import { TXS } from '@/services/merchant-finance.service'
import { SERVICE_REQUESTS } from '@/services/merchant-services.service'
const KEY = 'daam-db-v1'
const VERSION = 3
interface Snapshot { v: number; db: typeof db; mp: unknown[]; mo: unknown[]; mr: unknown[]; tx: unknown[]; sr: unknown[] }
const hydrate = (target: unknown[], saved?: unknown[]) => { if (Array.isArray(saved)) { target.length = 0; target.push(...saved) } }
try {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    const s = JSON.parse(raw) as Snapshot
    if (s.v === VERSION) {
      Object.assign(db, s.db)
      hydrate(merchantProducts, s.mp); hydrate(merchantOrders, s.mo); hydrate(merchantReturns, s.mr); hydrate(TXS, s.tx); hydrate(SERVICE_REQUESTS, s.sr)
    }
  }
} catch { /* تجاهل أي بيانات تالفة */ }
export function saveDb() {
  try {
    const s: Snapshot = { v: VERSION, db, mp: merchantProducts, mo: merchantOrders, mr: merchantReturns, tx: TXS, sr: SERVICE_REQUESTS }
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* تجاهل امتلاء التخزين */ }
}
setInterval(saveDb, 3000)
window.addEventListener('beforeunload', saveDb)
const win = window as typeof window & { __resetDb?: () => void }
win.__resetDb = () => { localStorage.removeItem(KEY); localStorage.removeItem('daam-merchant-passwords'); location.reload() }
console.info('💾 طبقة الحفظ التلقائي فعّالة — لإعادة تعيين البيانات التجريبية نفّذ: __resetDb()')
