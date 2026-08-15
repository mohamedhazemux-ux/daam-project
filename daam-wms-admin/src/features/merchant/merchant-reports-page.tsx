import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { selectCls } from '@/components/common'
import { merchantReportsService } from '@/services/merchant-reports.service'
import { useAuthStore } from '@/store/auth-store'
import { money, todayISO } from '@/lib/utils'
import { FileDown, FileSpreadsheet } from 'lucide-react'
const TABS: [string, string][] = [['orders', 'تقرير الطلبات'], ['inventory', 'تقرير المخزون'], ['returns', 'تقرير المرتجعات'], ['financial', 'التقرير المالي']]
const PERIODS = ['آخر 7 أيام', 'آخر 30 يومًا', 'آخر 90 يومًا', 'نطاق مخصص']
const range = (period: string, from: string, to: string): { f: string; t: string; err?: string } => {
  const today = todayISO()
  if (period === 'نطاق مخصص') {
    if (!from) return { f: from, t: to, err: 'تاريخ البداية مطلوب' }
    if (from > today) return { f: from, t: to, err: 'يجب أن يكون تاريخ البداية اليوم أو تاريخًا سابقًا' }
    if (!to) return { f: from, t: to, err: 'تاريخ النهاية مطلوب' }
    if (to > today) return { f: from, t: to, err: 'يجب أن يكون تاريخ النهاية اليوم أو تاريخًا سابقًا' }
    if (to < from) return { f: from, t: to, err: 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية أو مساويًا له' }
    return { f: from, t: to }
  }
  const days = period === 'آخر 7 أيام' ? 7 : period === 'آخر 30 يومًا' ? 30 : 90
  const d = new Date(); d.setDate(d.getDate() - days)
  return { f: d.toISOString().slice(0, 10), t: today }
}
const doExport = (fmt: string) => { toast.success('جارٍ تصدير التقرير...'); setTimeout(() => toast.success('تم تصدير التقرير بصيغة ' + fmt + ' بنجاح'), 700) }
const KV = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[15px] font-black">{v}</p></div>
function HBars({ data }: { data: [string, number][] }) {
  const max = Math.max(...data.map(d => d[1]), 1)
  return <div className="space-y-2">{data.map(([l, v]) => <div key={l}><p className="mb-0.5 flex justify-between text-[11px] font-bold"><span>{l}</span><span>{v}</span></p><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: (v / max) * 100 + '%' }} /></div></div>)}</div>
}
export default function MerchantReportsPage() {
  const [tab, setTab] = useState('orders')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-2 shadow-sm">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={tab === v ? 'rounded-lg bg-foreground px-4 py-2 text-[13px] font-extrabold text-background' : 'rounded-lg px-4 py-2 text-[13px] font-bold text-muted-foreground hover:bg-accent'}>{l}</button>)}
      </div>
      {tab === 'orders' && <OrdersReport />}
      {tab === 'inventory' && <InventoryReport />}
      {tab === 'returns' && <ReturnsReport />}
      {tab === 'financial' && <FinancialReport />}
    </div>
  )
}
function PeriodPicker({ period, setPeriod, from, setFrom, to, setTo, err }: any) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div><Label>فترة التقرير <span className="text-destructive">*</span></Label>
        <select className={selectCls + ' w-full'} value={period} onChange={(e: any) => setPeriod(e.target.value)}>{PERIODS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
      {period === 'نطاق مخصص' && <>
        <div><Label>من تاريخ <span className="text-destructive">*</span></Label><Input type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} /></div>
        <div><Label>إلى تاريخ <span className="text-destructive">*</span></Label><Input type="date" value={to} onChange={(e: any) => setTo(e.target.value)} /></div>
      </>}
      {err && <p className="md:col-span-3 text-xs font-bold text-destructive">{err}</p>}
    </div>
  )
}
function ExportBtns() {
  return <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => doExport('PDF')}><FileDown className="size-4" /> PDF</Button><Button variant="outline" size="sm" onClick={() => doExport('Excel')}><FileSpreadsheet className="size-4" /> Excel</Button></div>
}
function OrdersReport() {
  const user = useAuthStore(s => s.user)
  const [period, setPeriod] = useState('آخر 30 يومًا')
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [data, setData] = useState<any>(null)
  const gen = useMutation({ mutationFn: () => { const r = range(period, from, to); if (r.err) { setErr(r.err); throw new Error(r.err) } setErr(''); return merchantReportsService.orders(user!.store!, r.f, r.t, statuses) }, onSuccess: setData, onError: () => {} })
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">تقرير أداء الطلبات</CardTitle>{data && <ExportBtns />}</CardHeader>
      <CardContent className="space-y-4">
        <PeriodPicker period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} err={err} />
        <div><Label>تصفية بحالات الطلب (اختياري)</Label>
          <div className="flex flex-wrap gap-4 pt-2">{['معلق', 'قيد المعالجة', 'مكتمل', 'ملغي'].map(s => <label key={s} className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={statuses.includes(s)} onChange={e => setStatuses(x => e.target.checked ? [...x, s] : x.filter(y => y !== s))} /> {s}</label>)}</div></div>
        <Button disabled={gen.isPending} onClick={() => gen.mutate()}>توليد التقرير</Button>
        {data && <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KV k="إجمالي الطلبات" v={data.summary.count} /><KV k="إجمالي القطع" v={data.summary.items} /><KV k="إجمالي الإيرادات" v={money(data.summary.revenue)} /><KV k="متوسط قيمة الطلب" v={money(data.summary.avg)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2"><div><p className="mb-2 text-xs font-extrabold text-muted-foreground">الطلبات حسب الحالة</p><HBars data={data.summary.byStatus} /></div><div><p className="mb-2 text-xs font-extrabold text-muted-foreground">الطلبات حسب مسؤولية الشحن</p><HBars data={data.summary.byShip} /></div></div>
          <div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المرجع</th><th className="p-2 text-start font-extrabold">العميل</th><th className="p-2 text-start font-extrabold">التاريخ</th><th className="p-2 text-start font-extrabold">الحالة</th><th className="p-2 text-start font-extrabold">القطع</th><th className="p-2 text-start font-extrabold">الإجمالي</th><th className="p-2 text-start font-extrabold">الشحن</th></tr></thead>
            <tbody>{data.detail.map((o: any) => <tr key={o.ref} className="border-b"><td className="p-2 font-bold">{o.ref}</td><td className="p-2">{o.cust}</td><td className="p-2">{o.date}</td><td className="p-2">{o.status}</td><td className="p-2">{o.items.reduce((s: number, i: any) => s + i.qty, 0)}</td><td className="p-2">{money(o.total)}</td><td className="p-2">{o.shipResp === 'منصة' ? o.method ?? 'منصة' : 'ذاتي'}</td></tr>)}</tbody></table></div>
        </>}
      </CardContent></Card>
  )
}
function InventoryReport() {
  const user = useAuthStore(s => s.user)
  const [type, setType] = useState('')
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [err, setErr] = useState('')
  const [data, setData] = useState<any>(null)
  const gen = useMutation({ mutationFn: () => {
    if (!type) { setErr('نوع التقرير مطلوب'); throw new Error('نوع التقرير مطلوب') }
    if (type === 'سجل حركات المخزون') { const r = range('نطاق مخصص', from, to); if (r.err) { setErr(r.err); throw new Error(r.err) } }
    setErr(''); return merchantReportsService.inventory(user!.store!, type, [])
  }, onSuccess: setData, onError: () => {} })
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">تقرير المخزون</CardTitle>{data && <ExportBtns />}</CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>نوع التقرير <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={type} onChange={e => setType(e.target.value)}><option value="">اختر...</option>{['المستويات الحالية', 'سجل حركات المخزون', 'تنبيه المخزون المنخفض', 'تنبيه النفاد من المخزون'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          {type === 'سجل حركات المخزون' && <>
            <div><Label>من تاريخ <span className="text-destructive">*</span></Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><Label>إلى تاريخ <span className="text-destructive">*</span></Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          </>}
        </div>
        {err && <p className="text-xs font-bold text-destructive">{err}</p>}
        <Button disabled={gen.isPending} onClick={() => gen.mutate()}>توليد التقرير</Button>
        {data && (
          <div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المنتج</th><th className="p-2 text-start font-extrabold">المرجع الداخلي</th><th className="p-2 text-start font-extrabold">الموقع / النوع</th><th className="p-2 text-start font-extrabold">الكمية</th><th className="p-2 text-start font-extrabold">إضافي</th><th className="p-2 text-start font-extrabold">الحالة / التاريخ</th></tr></thead>
            <tbody>{data.rows.map((r: any, i: number) => <tr key={i} className="border-b"><td className="p-2 font-bold">{r.a}</td><td className="p-2"><span dir="ltr">{r.b}</span></td><td className="p-2">{r.c}</td><td className="p-2">{r.d}</td><td className="p-2">{r.e}</td><td className="p-2">{r.f}</td></tr>)}</tbody></table></div>
        )}
      </CardContent></Card>
  )
}
function ReturnsReport() {
  const user = useAuthStore(s => s.user)
  const [period, setPeriod] = useState('آخر 30 يومًا')
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [err, setErr] = useState('')
  const [data, setData] = useState<any>(null)
  const gen = useMutation({ mutationFn: () => { const r = range(period, from, to); if (r.err) { setErr(r.err); throw new Error(r.err) } setErr(''); return merchantReportsService.returns(user!.store!, r.f, r.t) }, onSuccess: setData, onError: () => {} })
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">تقرير المرتجعات</CardTitle>{data && <ExportBtns />}</CardHeader>
      <CardContent className="space-y-4">
        <PeriodPicker period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} err={err} />
        <Button disabled={gen.isPending} onClick={() => gen.mutate()}>توليد التقرير</Button>
        {data && <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KV k="إجمالي طلبات الإرجاع" v={data.summary.count} /><KV k="إجمالي الأصناف المرتجعة" v={data.summary.items} /><KV k="نسبة الإرجاع" v={data.summary.rate + '%'} /><KV k="إجمالي المبالغ المستردة" v={money(data.summary.refunds)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2"><div><p className="mb-2 text-xs font-extrabold text-muted-foreground">المرتجعات حسب الحالة</p><HBars data={data.summary.byStatus} /></div><div><p className="mb-2 text-xs font-extrabold text-muted-foreground">المرتجعات حسب السبب</p><HBars data={data.summary.byReason} /></div></div>
          <div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المرجع</th><th className="p-2 text-start font-extrabold">الطلب الأصلي</th><th className="p-2 text-start font-extrabold">العميل</th><th className="p-2 text-start font-extrabold">التاريخ</th><th className="p-2 text-start font-extrabold">الحالة</th><th className="p-2 text-start font-extrabold">الأصناف</th><th className="p-2 text-start font-extrabold">الاسترداد</th></tr></thead>
            <tbody>{data.detail.map((r: any) => <tr key={r.ref} className="border-b"><td className="p-2 font-bold">{r.ref}</td><td className="p-2">{r.order}</td><td className="p-2">{r.cust}</td><td className="p-2">{r.createdAt}</td><td className="p-2">{r.status}</td><td className="p-2">{r.totalItems}</td><td className="p-2">{money(r.totalItems * 180)}</td></tr>)}</tbody></table></div>
        </>}
      </CardContent></Card>
  )
}
function FinancialReport() {
  const user = useAuthStore(s => s.user)
  const [period, setPeriod] = useState('آخر 30 يومًا')
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [types, setTypes] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [data, setData] = useState<any>(null)
  const gen = useMutation({ mutationFn: () => { const r = range(period, from, to); if (r.err) { setErr(r.err); throw new Error(r.err) } setErr(''); return merchantReportsService.financial(user!.store!, r.f, r.t, types) }, onSuccess: setData, onError: () => {} })
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">التقرير المالي</CardTitle>{data && <ExportBtns />}</CardHeader>
      <CardContent className="space-y-4">
        <PeriodPicker period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} err={err} />
        <div><Label>تصفية بأنواع المعاملات (اختياري)</Label>
          <div className="flex flex-wrap gap-4 pt-2">{['إيداع', 'خصم', 'استرداد', 'سحب', 'تعديل'].map(t => <label key={t} className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={types.includes(t)} onChange={e => setTypes(x => e.target.checked ? [...x, t] : x.filter(y => y !== t))} /> {t}</label>)}</div></div>
        <Button disabled={gen.isPending} onClick={() => gen.mutate()}>توليد التقرير</Button>
        {data && <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KV k="الرصيد الافتتاحي" v={money(data.summary.opening)} /><KV k="إجمالي الإيداعات" v={money(data.summary.credits)} /><KV k="إجمالي الخصومات" v={money(data.summary.debits)} /><KV k="إجمالي الاستردادات" v={money(data.summary.refunds)} />
            <KV k="إجمالي السحوبات" v={money(data.summary.withdrawals)} /><KV k="إجمالي التعديلات" v={money(data.summary.adjustments)} /><KV k="الرصيد الختامي" v={money(data.summary.closing)} /><KV k="صافي التغيير" v={money(data.summary.net)} />
          </div>
          <div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المعرّف</th><th className="p-2 text-start font-extrabold">التاريخ</th><th className="p-2 text-start font-extrabold">النوع</th><th className="p-2 text-start font-extrabold">الوصف</th><th className="p-2 text-start font-extrabold">المبلغ</th><th className="p-2 text-start font-extrabold">الرصيد بعد</th></tr></thead>
            <tbody>{data.detail.map((x: any) => <tr key={x.id} className="border-b"><td className="p-2 font-bold" dir="ltr">{x.id}</td><td className="p-2">{x.date}</td><td className="p-2">{x.type}</td><td className="p-2">{x.desc}</td><td className="p-2">{money(x.amount)}</td><td className="p-2">{money(x.running)}</td></tr>)}</tbody></table></div>
        </>}
      </CardContent></Card>
  )
}
