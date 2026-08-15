import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { selectCls } from '@/components/common'
import { usePrefsStore } from '@/store/prefs-store'
import { useT } from '@/lib/i18n'
import { useAuthStore } from '@/store/auth-store'
import { merchantSettingsService, NOTIF_EVENTS, type MerchantSettings } from '@/services/merchant-settings.service'
export default function MerchantSettingsPage() {
  const t = useT()
  const user = useAuthStore(s => s.user)
  const theme = usePrefsStore(s => s.theme)
  const lang = usePrefsStore(s => s.lang)
  const [s, setS] = useState<MerchantSettings>(() => merchantSettingsService.loadSync(user?.store ?? ''))
  const [err, setErr] = useState('')
  const save = () => {
    if (!s.lowStockThreshold || s.lowStockThreshold < 1 || s.lowStockThreshold > 1000) { setErr('يجب أن يكون حد تنبيه المخزون المنخفض بين 1 و 1000'); return }
    if (!s.storageAlertPct || s.storageAlertPct < 50 || s.storageAlertPct > 100) { setErr('يجب أن تكون نسبة تنبيه التخزين بين 50% و 100%'); return }
    setErr('')
    merchantSettingsService.save(user?.store ?? '', s)
    toast.success('تم تحديث الإعدادات بنجاح')
  }
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">{t('المظهر واللغة')}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>{t('وضع العرض')}</Label>
            <select className={selectCls + ' w-full'} value={theme} onChange={e => usePrefsStore.getState().setTheme(e.target.value as 'light' | 'dark')}>
              <option value="light">فاتح (أبيض)</option><option value="dark">داكن (أسود)</option>
            </select></div>
          <div><Label>{t('لغة الواجهة')}</Label>
            <select className={selectCls + ' w-full'} value={lang} onChange={e => usePrefsStore.getState().setLang(e.target.value as 'ar' | 'en')}>
              <option value="ar">العربية</option><option value="en">English</option>
            </select></div>
        </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">إعدادات الإشعارات</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">الحدث</th><th className="p-2 font-extrabold">بريد إلكتروني</th><th className="p-2 font-extrabold">داخل التطبيق</th></tr></thead>
              <tbody>{NOTIF_EVENTS.map(e => (
                <tr key={e} className="border-b">
                  <td className="p-2 font-bold">{e}</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={s.notif[e]?.email ?? true} onChange={ev => setS(x => ({ ...x, notif: { ...x.notif, [e]: { ...x.notif[e], email: ev.target.checked } } }))} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={s.notif[e]?.app ?? true} onChange={ev => setS(x => ({ ...x, notif: { ...x.notif, [e]: { ...x.notif[e], app: ev.target.checked } } }))} /></td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">إعدادات الطلبات الافتراضية</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>مسؤولية الشحن الافتراضية للطلبات الجديدة</Label>
            <select className={selectCls + ' w-full'} value={s.defaultShip} onChange={e => setS(x => ({ ...x, defaultShip: e.target.value as '' | 'منصة' | 'ذاتي' }))}>
              <option value="">بدون افتراضي (اختيار يدوي)</option>
              <option value="منصة">شحن المنصة</option>
              <option value="ذاتي">الشحن الذاتي</option>
            </select></div>
          <div><Label>طريقة الشحن الافتراضية (لشحن المنصة)</Label>
            <select className={selectCls + ' w-full'} value={s.defaultMethod} onChange={e => setS(x => ({ ...x, defaultMethod: e.target.value }))}>
              <option value="الشحن القياسي">الشحن القياسي</option>
              <option value="الشحن السريع">الشحن السريع</option>
            </select></div>
        </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">التنبيهات والحدود</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>حد تنبيه المخزون المنخفض (1 – 1000)</Label><Input type="number" min={1} max={1000} value={s.lowStockThreshold || ''} onChange={e => setS(x => ({ ...x, lowStockThreshold: +e.target.value }))} /></div>
          <div><Label>نسبة تنبيه التخزين (50% – 100%)</Label><Input type="number" min={50} max={100} value={s.storageAlertPct || ''} onChange={e => setS(x => ({ ...x, storageAlertPct: +e.target.value }))} /></div>
        </CardContent></Card>
      {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{err}</p>}
      <Button onClick={save}>حفظ التغييرات</Button>
    </div>
  )
}
