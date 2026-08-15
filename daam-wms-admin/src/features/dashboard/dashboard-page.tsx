import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminDashboardService } from '@/services/admin-dashboard.service'
import { useT } from '@/lib/i18n'
import { money } from '@/lib/utils'
import { Banknote, Layers, ShieldCheck, ShoppingCart, Store, Undo2, Wallet, Wrench } from 'lucide-react'
function Line({ data }: { data: number[] }) {
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => ((i / (data.length - 1)) * 300).toFixed(1) + ',' + (70 - ((v - min) / (max - min || 1)) * 60).toFixed(1)).join(' ')
  return <svg viewBox="0 0 300 80" className="h-28 w-full text-foreground" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" /></svg>
}
function HBars({ data }: { data: [string, number][] }) {
  const max = Math.max(...data.map(d => d[1]), 1)
  return <div className="space-y-2">{data.map(([l, v]) => <div key={l}><p className="mb-0.5 flex justify-between text-[11px] font-bold"><span className="truncate">{l}</span><span>{money(v)}</span></p><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: (v / max) * 100 + '%' }} /></div></div>)}</div>
}
export default function DashboardPage() {
  const t = useT()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: () => adminDashboardService.stats(), refetchInterval: 60_000 })
  if (isLoading || !data) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
  const cards = [
    { l: 'التجار', v: String(data.merchants), to: '/merchants', icon: Store },
    { l: 'الطلبات المعلقة', v: String(data.ordersPending), to: '/orders', icon: ShoppingCart },
    { l: 'طلبات المخزون المعلقة', v: String(data.stockPending), to: '/inventory/requests', icon: Layers },
    { l: 'المرتجعات المعلقة', v: String(data.returnsPending), to: '/returns', icon: Undo2 },
    { l: 'طلبات السحب المعلقة', v: String(data.wdPending), to: '/finance/withdrawals', icon: Banknote },
    { l: 'طلبات الخدمة المعلقة', v: String(data.srvPending), to: '/services/requests', icon: Wrench },
    { l: 'الموافقات المعلقة', v: String(data.approvals), to: '/approvals', icon: ShieldCheck },
    { l: 'إجمالي أرصدة المحافظ', v: money(data.revenue), to: '/finance/wallets', icon: Wallet },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(c => (
          <button key={c.l} onClick={() => navigate(c.to)} className="rounded-xl border bg-card p-4 text-start shadow-sm transition-colors hover:bg-accent">
            <c.icon className="mb-2 size-5 text-muted-foreground" />
            <p className="text-2xl font-black">{c.v}</p>
            <p className="text-[11px] font-bold text-muted-foreground">{t(c.l)}</p>
          </button>))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardContent className="pt-4"><p className="mb-2 text-xs font-extrabold text-muted-foreground">{t('اتجاه الطلبات — آخر ٣٠ يومًا')}</p><Line data={data.trend} /></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="mb-2 text-xs font-extrabold text-muted-foreground">{t('أعلى التجار بالرصيد')}</p><HBars data={data.topMerchants} /></CardContent></Card>
      </div>
    </div>
  )
}
