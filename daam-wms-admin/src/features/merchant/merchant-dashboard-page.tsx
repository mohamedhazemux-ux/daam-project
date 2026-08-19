import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common'
import { merchantPortalService } from '@/services/merchant-portal.service'
import { merchantProductsService } from '@/services/merchant-products.service'
import { useAuthStore } from '@/store/auth-store'
import { usePrefsStore } from '@/store/prefs-store'
import { useT } from '@/lib/i18n'
import { money, todayISO } from '@/lib/utils'
import { printMerchantDashboardPDF } from '@/lib/pdf-utils'
import { FileText, Layers, Package, ShoppingCart, Undo2, Wallet, FileDown, AlertTriangle } from 'lucide-react'
function Line({ data }: { data: number[] }) {
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => ((i / (data.length - 1)) * 300).toFixed(1) + ',' + (70 - ((v - min) / (max - min || 1)) * 60).toFixed(1)).join(' ')
  return <svg viewBox="0 0 300 80" className="h-24 w-full text-foreground" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" /></svg>
}
function HBars({ data }: { data: [string, number][] }) {
  const max = Math.max(...data.map(d => d[1]), 1)
  return <div className="space-y-2">{data.map(([l, v]) => <div key={l}><p className="mb-0.5 flex justify-between text-[11px] font-bold"><span className="truncate">{l}</span><span>{v}</span></p><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: (v / max) * 100 + '%' }} /></div></div>)}</div>
}
function Pie({ data }: { data: [string, number][] }) {
  const total = data.reduce((s, d) => s + d[1], 0) || 1
  const colors = ['#0a0a0a', '#f59e0b', '#10b981', '#ef4444']
  const slices = data.reduce<Array<{ label: string; value: number; from: number; to: number }>>((acc, [label, value]) => {
    const start = acc.length ? acc[acc.length - 1].to : 0
    const from = (start / total) * 360
    const to = ((start + value) / total) * 360
    acc.push({ label, value, from, to })
    return acc
  }, [])
  const stops = slices.map((slice, index) => colors[index % colors.length] + ' ' + slice.from + 'deg ' + slice.to + 'deg').join(', ')
  return <div className="flex items-center gap-4"><div className="size-24 shrink-0 rounded-full" style={{ background: 'conic-gradient(' + stops + ')' }} /><div className="space-y-1">{slices.map((slice, i) => <p key={slice.label} className="flex items-center gap-2 text-[11px] font-bold"><span className="size-2.5 rounded-full" style={{ background: colors[i % 4] }} /> {slice.label} ({slice.value})</p>)}</div></div>
}
function Stacked({ data }: { data: [string, number, number][] }) {
  const max = Math.max(...data.map(d => d[1] + d[2]), 1)
  return <div className="flex h-28 items-end justify-around gap-4">{data.map(([l, a, r]) => <div key={l} className="flex flex-1 flex-col items-center gap-1"><div className="flex w-8 flex-col justify-end overflow-hidden rounded-md" style={{ height: '100%' }}><div className="bg-amber-400" style={{ height: (r / max) * 100 + '%' }} /><div className="bg-foreground" style={{ height: (a / max) * 100 + '%' }} /></div><p className="text-[10px] font-bold text-muted-foreground">{l}</p></div>)}</div>
}
export default function MerchantDashboardPage() {
  const t = useT()
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dErr, setDErr] = useState('')
  const { data, isLoading, isError } = useQuery({ queryKey: ['merchant-dashboard', user?.id], queryFn: () => merchantPortalService.dashboard(user!.id), refetchInterval: 300_000, retry: 1 })
  const { data: an } = useQuery({ queryKey: ['merchant-analytics', user?.id], queryFn: () => merchantProductsService.analytics(user!.store ?? ''), refetchInterval: 300_000 })
  const applyRange = () => {
    if (from && from > todayISO()) { setDErr('يجب أن يكون تاريخ البداية اليوم أو تاريخًا سابقًا'); return }
    if (to && to > todayISO()) { setDErr('يجب أن يكون تاريخ النهاية اليوم أو تاريخًا سابقًا'); return }
    if (from && to && to < from) { setDErr('يجب أن يكون تاريخ النهاية بعد تاريخ البداية أو مساويًا له'); return }
    setDErr('')
    toast.success('تم تطبيق نطاق التاريخ على بيانات لوحة التحكم')
  }
  const exportDashboardPdf = () => {
    if (!data) return
    const success = printMerchantDashboardPDF({
      merchantName: user?.name ?? 'التاجر',
      storeName: user?.store ?? 'متجر التاجر',
      date: todayISO(),
      from: from || undefined,
      to: to || undefined,
      lang: usePrefsStore.getState().lang,
      metrics: {
        storagePct: data.storagePct,
        storageUsed: data.used,
        storageLimit: data.limit,
        storageUnit: data.unit,
        storageStatus: data.storageStatus,
        totalProducts: an?.totalProducts ?? 0,
        activeOrders: an?.activeOrders ?? 0,
        completedOrders: an?.completedOrders ?? 0,
        pendingReturns: an?.pendingReturns ?? 0,
        walletBalance: data.walletBalance,
        lowStock: an?.lowStock ?? 0,
        outStock: an?.outStock ?? 0,
        currentInvoiceAmount: data.currentInvoice ? data.currentInvoice.total : 0,
        platformProducts: data.platformProducts,
      },
      topProducts: (an?.top ?? []).map(([label, value]) => ({ label, value })),
      orderStatusDist: (an?.statusDist ?? []).map(([label, value]) => ({ label, value })),
      stockByWarehouse: (an?.stockByWh ?? []).map(([warehouse, available, reserved]) => ({ warehouse, available, reserved })),
    })
    if (success) {
      toast.success(t('تم تجهيز تقرير لوحة التحكم بصيغة PDF'))
    } else {
      toast.error(t('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة.'))
    }
  }
  if (isLoading) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
  if (isError || !data) return <Card><CardContent className="p-8 text-center text-sm font-extrabold text-destructive">تعذر تحميل لوحة التحكم — سجّل الدخول مجددًا</CardContent></Card>
  const bar = data.storageStatus === 'متجاوز' ? 'bg-destructive' : data.storageStatus === 'تحذير' ? 'bg-warning' : 'bg-foreground'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <div><Label>{t('من تاريخ')}</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>{t('إلى تاريخ')}</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button size="sm" onClick={applyRange}>{t('تطبيق النطاق')}</Button>
        <Button size="sm" variant="outline" className="ms-auto" onClick={exportDashboardPdf}><FileDown className="size-4" /> {t('تصدير PDF')}</Button>
        <p className="text-[11px] font-semibold text-muted-foreground">{t('تحديث تلقائي كل ٥ دقائق')}</p>
      </div>
      {dErr && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{dErr}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <button onClick={() => navigate('/merchant/inventory')} className="rounded-xl border bg-card p-3 text-start shadow-sm">
          <div className="mb-2 flex items-center justify-between"><Layers className="size-4 text-muted-foreground" /><StatusBadge value={data.storageStatus} /></div>
          <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-muted"><div className={'h-full ' + bar} style={{ width: Math.min(100, data.storagePct) + '%' }} /></div>
          <p className={'mt-2 text-lg font-black ' + (data.storagePct >= 100 ? 'text-destructive' : data.storagePct >= 80 ? 'text-amber-600' : '')}>{data.storagePct}%</p>
          <p className="text-[11px] font-bold text-muted-foreground">استخدام التخزين ({data.used}/{data.limit} {data.unit})</p>
        </button>
        <button onClick={() => navigate('/merchant/products')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><Package className="mb-2 size-4 text-muted-foreground" /><p className="text-lg font-black">{an?.totalProducts ?? 0}</p><p className="text-[11px] font-bold text-muted-foreground">{t('إجمالي المنتجات')}</p></button>
        <button onClick={() => navigate('/merchant/orders')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><ShoppingCart className="mb-2 size-4 text-muted-foreground" /><p className="text-lg font-black">{an?.activeOrders ?? 0}</p><p className="text-[11px] font-bold text-muted-foreground">{t('طلبات نشطة')}</p></button>
        <button onClick={() => navigate('/merchant/orders')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><ShoppingCart className="mb-2 size-4 text-muted-foreground" /><p className="text-lg font-black">{an?.completedOrders ?? 0}</p><p className="text-[11px] font-bold text-muted-foreground">{t('طلبات مكتملة')}</p></button>
        <button onClick={() => navigate('/merchant/returns')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><Undo2 className="mb-2 size-4 text-muted-foreground" /><p className="text-lg font-black">{an?.pendingReturns ?? 0}</p><p className="text-[11px] font-bold text-muted-foreground">{t('مرتجعات معلقة')}</p></button>
        <button onClick={() => navigate('/merchant/wallet')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><Wallet className="mb-2 size-4 text-muted-foreground" /><p className="text-lg font-black">{money(data.walletBalance)}</p><p className="text-[11px] font-bold text-muted-foreground">{t('رصيد المحفظة')}</p></button>
        <button onClick={() => navigate('/merchant/products')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><AlertTriangle className="mb-2 size-4 text-muted-foreground" /><p className={'text-lg font-black ' + ((an?.lowStock ?? 0) > 0 ? 'text-destructive' : '')}>{an?.lowStock ?? 0}</p><p className="text-[11px] font-bold text-muted-foreground">{t('منتجات منخفضة المخزون')}</p></button>
        <button onClick={() => navigate('/merchant/products')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><AlertTriangle className="mb-2 size-4 text-muted-foreground" /><p className={'text-lg font-black ' + ((an?.outStock ?? 0) > 0 ? 'text-destructive' : '')}>{an?.outStock ?? 0}</p><p className="text-[11px] font-bold text-muted-foreground">{t('منتجات نفد مخزونها')}</p></button>
        <button onClick={() => navigate('/merchant/wallet')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><FileText className="mb-2 size-4 text-muted-foreground" /><p className="text-lg font-black">{data.currentInvoice ? money(data.currentInvoice.total) : t('بانتظار التوليد')}</p><p className="text-[11px] font-bold text-muted-foreground">{t('فاتورة الشهر الحالي')}</p></button>
        <button onClick={() => navigate('/merchant/products')} className="rounded-xl border bg-card p-3 text-start shadow-sm"><Package className="mb-2 size-4 text-muted-foreground" /><p className="text-lg font-black">{data.platformProducts}</p><p className="text-[11px] font-bold text-muted-foreground">{t('منتجات المنصة المتاحة')}</p></button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">{t('اتجاه الطلبات — آخر ٣٠ يومًا')}</CardTitle></CardHeader><CardContent><Line data={an?.trend ?? []} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t('توزيع حالات الطلبات')}</CardTitle></CardHeader><CardContent><Pie data={an?.statusDist ?? []} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t('المنتجات الأكثر مبيعًا')}</CardTitle></CardHeader><CardContent><HBars data={an?.top ?? []} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t('المخزون حسب موقع المستودع (متاح/محجوز)')}</CardTitle></CardHeader><CardContent><Stacked data={an?.stockByWh ?? []} /></CardContent></Card>
        <Card className="xl:col-span-2"><CardHeader><CardTitle className="text-sm">{t('اتجاه الإيرادات الشهري — آخر ١٢ شهرًا')}</CardTitle></CardHeader><CardContent><Line data={an?.revenue ?? []} /></CardContent></Card>
      </div>
    </div>
  )
}
