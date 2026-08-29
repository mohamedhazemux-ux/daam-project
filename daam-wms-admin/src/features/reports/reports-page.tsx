import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { selectCls } from '@/components/common'
import { money, todayISO } from '@/lib/utils'
import { useT } from '@/lib/i18n'

const REPORT_TYPES = ['تقرير أداء المنصة', 'تقرير أداء الموافقات', 'تقرير استخدام المستودع', 'الملخص المالي']
const PERIODS = ['آخر 7 أيام', 'آخر 30 يومًا', 'آخر 90 يومًا', 'آخر 12 شهرًا', 'نطاق مخصص']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ReportsPage() {
  const t = useT()
  const [type, setType] = useState(REPORT_TYPES[0])
  const [period, setPeriod] = useState('آخر 30 يومًا')
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [gErr, setGErr] = useState('')
  const [preview, setPreview] = useState(false)
  const [sName, setSName] = useState(''); const [sType, setSType] = useState(REPORT_TYPES[0]); const [sFreq, setSFreq] = useState('أسبوعي'); const [sDay, setSDay] = useState('1'); const [sRec, setSRec] = useState(''); const [sFormat, setSFormat] = useState('PDF')
  const [sErr, setSErr] = useState('')
  const generate = () => {
    if (period === 'نطاق مخصص') {
      if (!from) { setGErr(t('تاريخ البداية مطلوب')); return }
      if (from > todayISO()) { setGErr(t('يجب أن يكون تاريخ البداية اليوم أو تاريخًا سابقًا')); return }
      if (!to) { setGErr(t('تاريخ النهاية مطلوب')); return }
      if (to > todayISO()) { setGErr(t('يجب أن يكون تاريخ النهاية اليوم أو تاريخًا سابقًا')); return }
      if (to < from) { setGErr(t('يجب أن يكون تاريخ النهاية بعد تاريخ البداية أو مساويًا له')); return }
    }
    setGErr('')
    setPreview(true)
    toast.success(t('تم توليد التقرير بنجاح'))
  }
  const schedule = () => {
    if (sName.length < 3 || sName.length > 100) { setSErr(t('يجب أن يكون اسم التقرير بين 3 و 100 حرف')); return }
    const emails = sRec.split(',').map(e => e.trim()).filter(Boolean)
    if (emails.length === 0) { setSErr(t('مطلوب مستلم واحد على الأقل')); return }
    if (emails.some(e => !EMAIL_RE.test(e))) { setSErr(t('يجب أن تتبع جميع بريدين المستلمين صيغة example@example')); return }
    if (emails.length > 10) { setSErr(t('الحد الأقصى 10 مستلمين')); return }
    if (sFreq === 'شهري') {
      const d = +sDay
      if (!d || d < 1) { setSErr(t('يوم الشهر يجب أن يكون 1 على الأقل')); return }
      if (d > 28) { setSErr(t('يوم الشهر يجب أن يكون أقل من 28')); return }
    }
    setSErr('')
    toast.success(t('تمت جدولة التقرير التلقائي بنجاح — تم توليد تقرير تجريبي وإرساله للمستلمين'))
    setSName(''); setSRec('')
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">{t('توليد تقرير')}</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>{t('نوع التقرير')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={type} onChange={e => setType(e.target.value)}>{REPORT_TYPES.map(rt => <option key={rt} value={rt}>{t(rt)}</option>)}</select></div>
          <div><Label>{t('الفترة')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={period} onChange={e => setPeriod(e.target.value)}>{PERIODS.map(p => <option key={p} value={p}>{t(p)}</option>)}</select></div>
          {period === 'نطاق مخصص' && <div className="grid grid-cols-2 gap-3">
            <div><Label>{t('من تاريخ')}</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><Label>{t('إلى تاريخ')}</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          </div>}
          {gErr && <p className="text-xs font-bold text-destructive">{gErr}</p>}
          <Button onClick={generate}>{t('توليد التقرير')}</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">{t('جدولة تقرير تلقائي')}</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><Label>{t('اسم التقرير')} (3 – 100 {t('حرف')}) <span className="text-destructive">*</span></Label><Input value={sName} onChange={e => setSName(e.target.value)} placeholder={t('مثال: تقرير الأداء الأسبوعي')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t('النوع')}</Label><select className={selectCls + ' w-full'} value={sType} onChange={e => setSType(e.target.value)}>{REPORT_TYPES.map(rt => <option key={rt} value={rt}>{t(rt)}</option>)}</select></div>
            <div><Label>{t('التكرار')}</Label><select className={selectCls + ' w-full'} value={sFreq} onChange={e => setSFreq(e.target.value)}>{['يومي', 'أسبوعي', 'شهري'].map(f => <option key={f} value={f}>{t(f)}</option>)}</select></div>
          </div>
          {sFreq === 'شهري' && <div><Label>{t('يوم الشهر')} (1 – 28)</Label><Input type="number" min={1} max={28} value={sDay} onChange={e => setSDay(e.target.value)} /></div>}
          <div><Label>{t('المستلمون (حتى 10 بريد مفصولة بفواصل)')} <span className="text-destructive">*</span></Label><Input dir="ltr" value={sRec} onChange={e => setSRec(e.target.value)} placeholder="ceo@daam.sa, ops@daam.sa" /></div>
          <div><Label>{t('الصيغة')}</Label><select className={selectCls + ' w-full'} value={sFormat} onChange={e => setSFormat(e.target.value)}>{['PDF', 'Excel', 'كلاهما'].map(f => <option key={f} value={f}>{t(f)}</option>)}</select></div>
          {sErr && <p className="text-xs font-bold text-destructive">{sErr}</p>}
          <Button onClick={schedule}>{t('حفظ الجدولة')}</Button>
        </CardContent></Card>
      </div>
      {preview && (
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">{t('معاينة')} — {t(type)} ({t(period)})</CardTitle>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => toast.success(t('تم تصدير التقرير بصيغة PDF'))}>PDF</Button><Button variant="outline" size="sm" onClick={() => toast.success(t('تم تصدير التقرير بصيغة Excel'))}>Excel</Button></div></CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[['1,284', t('إجمالي الطلبات المعالجة')], ['3,960', t('إجمالي القطع المنفذة')], ['96.4%', t('معدل تنفيذ الطلبات')], ['3.8%', t('نسبة الإرجاع')], [money(412580), t('صافي الإيرادات')], ['5.2 ' + t('ساعة'), t('متوسط زمن الموافقة')]].map(([v, l]) => (
                <div key={l} className="rounded-lg border p-3"><p className="text-base font-black">{v}</p><p className="text-[11px] font-bold text-muted-foreground">{l}</p></div>))}
            </div>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('التاجر')}</th><th className="p-2 text-start font-extrabold">{t('الطلبات')}</th><th className="p-2 text-start font-extrabold">{t('الإيرادات')}</th><th className="p-2 text-start font-extrabold">{t('نسبة الإرجاع')}</th><th className="p-2 text-start font-extrabold">{t('متوسط قيمة الطلب')}</th></tr></thead>
                <tbody>{[['مؤسسة ركن القهوة', 214, 148900, '2.1%', 696], ['متجر البن الذهبي', 186, 121400, '3.4%', 653], ['متجر النقاء للتنظيف', 158, 78300, '4.2%', 496], ['متجر الجمال الحديث', 121, 61750, '5.1%', 510]].map(r => (
                  <tr key={r[0] as string} className="border-b"><td className="p-2 font-bold">{t(r[0] as string)}</td><td className="p-2">{r[1]}</td><td className="p-2">{money(r[2] as number)}</td><td className="p-2">{r[3]}</td><td className="p-2">{money(r[4] as number)}</td></tr>))}
                </tbody></table>
            </div>
          </CardContent></Card>
      )}
    </div>
  )
}
