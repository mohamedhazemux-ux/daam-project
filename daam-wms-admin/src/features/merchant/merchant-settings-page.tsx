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
const TABS: [string, string][] = [
  ['general', 'المظهر واللغة'],
  ['notif', 'إعدادات الإشعارات'],
  ['orders', 'إعدادات الطلبات'],
  ['limits', 'التنبيهات والحدود'],
]

export default function MerchantSettingsPage() {
  const t = useT()
  const user = useAuthStore(s => s.user)
  const theme = usePrefsStore(s => s.theme)
  const lang = usePrefsStore(s => s.lang)
  const [tab, setTab] = useState('general')
  const [s, setS] = useState<MerchantSettings>(() => merchantSettingsService.loadSync(user?.store ?? ''))
  const [err, setErr] = useState('')
  const save = () => {
    if (!s.lowStockThreshold || s.lowStockThreshold < 1 || s.lowStockThreshold > 1000) { setErr(t('يجب أن يكون حد تنبيه المخزون المنخفض بين 1 و 1000')); return }
    if (!s.storageAlertPct || s.storageAlertPct < 50 || s.storageAlertPct > 100) { setErr(t('يجب أن تكون نسبة تنبيه التخزين بين 50% و 100%')); return }
    setErr('')
    merchantSettingsService.save(user?.store ?? '', s)
    toast.success(t('تم تحديث الإعدادات بنجاح'))
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-2 shadow-sm">
        {TABS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={
              tab === v
                ? 'rounded-lg bg-foreground px-4 py-2 text-[13px] font-extrabold text-background'
                : 'rounded-lg px-4 py-2 text-[13px] font-bold text-muted-foreground hover:bg-accent'
            }
          >
            {t(l)}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('المظهر واللغة')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>{t('وضع العرض')}</Label>
              <select className={selectCls + ' w-full'} value={theme} onChange={e => usePrefsStore.getState().setTheme(e.target.value as 'light' | 'dark')}>
                <option value="light">{t('فاتح (أبيض)')}</option><option value="dark">{t('داكن (أسود)')}</option>
              </select></div>
            <div><Label>{t('لغة الواجهة')}</Label>
              <select className={selectCls + ' w-full'} value={lang} onChange={e => usePrefsStore.getState().setLang(e.target.value as 'ar' | 'en')}>
                <option value="ar">{t('العربية')}</option><option value="en">English</option>
              </select></div>
          </CardContent></Card>
      )}

      {tab === 'notif' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('إعدادات الإشعارات')}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('الحدث')}</th><th className="p-2 font-extrabold">{t('بريد إلكتروني')}</th><th className="p-2 font-extrabold">{t('داخل التطبيق')}</th></tr></thead>
                <tbody>{NOTIF_EVENTS.map(e => (
                  <tr key={e} className="border-b">
                    <td className="p-2 font-bold">{t(e)}</td>
                    <td className="p-2 text-center"><input type="checkbox" checked={s.notif[e]?.email ?? true} onChange={ev => setS(x => ({ ...x, notif: { ...x.notif, [e]: { ...x.notif[e], email: ev.target.checked } } }))} /></td>
                    <td className="p-2 text-center"><input type="checkbox" checked={s.notif[e]?.app ?? true} onChange={ev => setS(x => ({ ...x, notif: { ...x.notif, [e]: { ...x.notif[e], app: ev.target.checked } } }))} /></td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
      )}

      {tab === 'orders' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('إعدادات الطلبات الافتراضية')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>{t('مسؤولية الشحن الافتراضية للطلبات الجديدة')}</Label>
              <select className={selectCls + ' w-full'} value={s.defaultShip} onChange={e => setS(x => ({ ...x, defaultShip: e.target.value as '' | 'منصة' | 'ذاتي' }))}>
                <option value="">{t('بدون افتراضي (اختيار يدوي)')}</option>
                <option value="منصة">{t('شحن المنصة')}</option>
                <option value="ذاتي">{t('الشحن الذاتي')}</option>
              </select></div>
            <div><Label>{t('طريقة الشحن الافتراضية (لشحن المنصة)')}</Label>
              <select className={selectCls + ' w-full'} value={s.defaultMethod} onChange={e => setS(x => ({ ...x, defaultMethod: e.target.value }))}>
                <option value="الشحن القياسي">{t('الشحن القياسي')}</option>
                <option value="الشحن السريع">{t('الشحن السريع')}</option>
              </select></div>
          </CardContent></Card>
      )}

      {tab === 'limits' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('التنبيهات والحدود')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{t('حد تنبيه المخزون المنخفض (1 – 1000)')}</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                placeholder={t('أدخل قيمة بين 1 و 1000')}
                value={s.lowStockThreshold || ''}
                onChange={e => {
                  const v = e.target.value === '' ? 0 : Number(e.target.value)
                  setS(x => ({ ...x, lowStockThreshold: v }))
                  if (v > 0 && (v < 1 || v > 1000)) setErr(t('يجب أن تكون القيمة بين 1 و 1000'))
                  else setErr('')
                }}
              />
              <p className="mt-1 text-[11px] font-bold text-muted-foreground">{t('الحد الأدنى')}: <b className="text-foreground">1</b> — {t('الحد الأقصى')}: <b className="text-foreground">1000</b></p>
            </div>
            <div>
              <Label>{t('نسبة تنبيه التخزين (50% – 100%)')}</Label>
              <Input
                type="number"
                min={50}
                max={100}
                placeholder={t('أدخل نسبة بين 50 و 100')}
                value={s.storageAlertPct || ''}
                onChange={e => {
                  const v = e.target.value === '' ? 0 : Number(e.target.value)
                  setS(x => ({ ...x, storageAlertPct: v }))
                  if (v > 0 && (v < 50 || v > 100)) setErr(t('يجب أن تكون النسبة بين 50% و 100%'))
                  else setErr('')
                }}
              />
              <p className="mt-1 text-[11px] font-bold text-muted-foreground">{t('الحد الأدنى')}: <b className="text-foreground">50%</b> — {t('الحد الأقصى')}: <b className="text-foreground">100%</b></p>
            </div>
          </CardContent></Card>
      )}

      {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{err}</p>}
      <Button onClick={save}>{t('حفظ التغييرات')}</Button>
    </div>
  )
}

