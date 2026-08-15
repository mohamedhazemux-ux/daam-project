import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/common'
import { inventoryService } from '@/services/inventory.service'
import { productsService } from '@/services/products.service'
import { systemExtraService } from '@/services/system-extra.service'
import { money } from '@/lib/utils'
import { FileText, RefreshCw, RotateCcw } from 'lucide-react'
export function AdminExtras() {
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <StorageAlertsCard />
      <AutomationCard />
      <DeletedProductsCard />
    </div>
  )
}
function StorageAlertsCard() {
  const { data } = useQuery({ queryKey: ['storage-usage-top'], queryFn: () => inventoryService.usage({ page: 1, pageSize: 100 }) })
  const rows = (data?.rows ?? []) as any[]
  const exceeded = rows.filter(r => r.st === 'متجاوز').length
  const top = [...rows].sort((a, b) => b.pct - a.pct).slice(0, 10)
  return (
    <Card><CardHeader><CardTitle className="text-sm">تنبيهات التخزين</CardTitle></CardHeader>
      <CardContent>
        <div className={'mb-3 rounded-lg border p-3 ' + (exceeded > 0 ? 'border-destructive/40 bg-red-50' : 'bg-muted/40')}>
          <p className="text-[11px] font-bold text-muted-foreground">عدد التجار المتجاوزين لحد التخزين</p>
          <p className={'text-2xl font-black ' + (exceeded > 0 ? 'text-destructive' : '')}>{exceeded}</p>
        </div>
        <p className="mb-2 text-xs font-extrabold text-muted-foreground">استخدام التخزين حسب التاجر — أعلى ١٠</p>
        <div className="space-y-2">
          {top.map(r => (
            <div key={r.id}>
              <p className="mb-0.5 flex justify-between text-[11px] font-bold"><span className="truncate">{r.store}</span><span>{r.pct}%</span></p>
              <div className="h-2 rounded-full bg-muted"><div className={'h-full rounded-full ' + (r.st === 'متجاوز' ? 'bg-destructive' : r.st === 'تحذير' ? 'bg-warning' : 'bg-foreground')} style={{ width: Math.min(100, r.pct) + '%' }} /></div>
            </div>))}
        </div>
      </CardContent></Card>
  )
}
function AutomationCard() {
  const qc = useQueryClient()
  const [summary, setSummary] = useState<{ title: string; lines: [string, string][] } | null>(null)
  const billing = useMutation({ mutationFn: () => systemExtraService.runBillingCycle(), onSuccess: r => { setSummary({ title: 'ملخص دورة الفوترة المتكررة (CR-004)', lines: [['إجمالي الاشتراكات المعالجة', String(r.processed)], ['رسوم ناجحة', String(r.ok)], ['رسوم فاشلة', String(r.fail)], ['إجمالي المحصل', money(r.collected)]] }); qc.invalidateQueries(); toast.success('تم تشغيل دورة الفوترة المتكررة بنجاح') } })
  const invoices = useMutation({ mutationFn: () => systemExtraService.generateMonthlyInvoices(), onSuccess: r => { setSummary({ title: 'ملخص توليد الفواتير الشهرية (CR-005)', lines: [['عدد الفواتير المولدة', String(r.count)], ['إجمالي المفوتر', money(r.total)], ['بريدات مرسلة', String(r.sent)], ['بريدات فاشلة', String(r.failed)]] }); qc.invalidateQueries(); toast.success('تم توليد الفواتير الشهرية بنجاح') } })
  return (
    <Card><CardHeader><CardTitle className="text-sm">الأتمتة والمهام المجدولة (محاكاة)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">في الإنتاج تعمل هذه المهام تلقائيًا (الفوترة يوميًا ٠٠:٠٠ والفواتير يوم التوليد ٠٢:٠٠). هنا تشغّلها يدويًا:</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={billing.isPending} onClick={() => billing.mutate()}><RefreshCw className="size-4" /> تشغيل دورة الفوترة المتكررة الآن</Button>
          <Button variant="outline" size="sm" disabled={invoices.isPending} onClick={() => invoices.mutate()}><FileText className="size-4" /> توليد الفواتير الشهرية الآن</Button>
        </div>
      </CardContent>
      <Modal open={!!summary} onClose={() => setSummary(null)} title={summary?.title ?? ''} footer={<Button variant="outline" onClick={() => setSummary(null)}>إغلاق</Button>}>
        <div className="grid grid-cols-2 gap-3">{summary?.lines.map(([k, v]) => <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[15px] font-black">{v}</p></div>)}</div>
      </Modal>
    </Card>
  )
}
function DeletedProductsCard() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['deleted-products'], queryFn: () => productsService.deletedList() })
  const restore = useMutation({ mutationFn: (ref: string) => productsService.restore(ref), onSuccess: () => { toast.success('تم استعادة منتج المنصة بنجاح'); qc.invalidateQueries({ queryKey: ['deleted-products'] }); qc.invalidateQueries({ queryKey: ['platform-products'] }) }, onError: e => toast.error((e as Error).message) })
  return (
    <Card className="xl:col-span-2"><CardHeader><CardTitle className="text-sm">سجل الحذف — منتجات المنصة</CardTitle></CardHeader>
      <CardContent>
        {(data ?? []).length === 0 ? <p className="p-4 text-center text-xs font-bold text-muted-foreground">لا توجد منتجات محذوفة — احذف منتجًا من صفحة منتجات المنصة ليظهر هنا</p> : (
          <div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">المرجع</th><th className="p-2 text-start font-extrabold">الاسم</th><th className="p-2 text-start font-extrabold">تاريخ الحذف</th><th className="p-2" /></tr></thead>
            <tbody>{(data ?? []).map((p: any) => <tr key={p.ref} className="border-b"><td className="p-2"><span dir="ltr">{p.ref}</span></td><td className="p-2 font-bold">{p.name}</td><td className="p-2">{p.deletedAt}</td><td className="p-2"><Button size="sm" variant="outline" onClick={() => restore.mutate(p.ref)}><RotateCcw className="size-4" /> استعادة</Button></td></tr>)}</tbody></table></div>
        )}
      </CardContent></Card>
  )
}

