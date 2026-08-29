import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploadWithPreview, Modal, StatusBadge, selectCls } from '@/components/common'
import { systemService } from '@/services/system.service'
import { systemExtraService, EVENTS, type EmailTemplate } from '@/services/system-extra.service'
import { usePrefsStore } from '@/store/prefs-store'
import { useT } from '@/lib/i18n'
const TABS: [string, string][] = [['general', 'عام'], ['orders', 'الطلبات'], ['inventory', 'المخزون والتخزين'], ['finance', 'المالية والفوترة'], ['notif', 'الإشعارات'], ['templates', 'قوالب البريد'], ['integrations', 'التكاملات']]
export default function SettingsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('general')
  const [logo, setLogo] = useState<string[]>([])
  const t = useT()
  const { data: events } = useQuery({ queryKey: ['notif-events'], queryFn: () => systemService.notifEvents() })
  const { data: integrations } = useQuery({ queryKey: ['integrations'], queryFn: () => systemExtraService.integrations() })
  const [retention, setRetention] = useState('90')
  const [rErr, setRErr] = useState('')
  const [chEmail, setChEmail] = useState(true)
  const [chApp, setChApp] = useState(true)
  const theme = usePrefsStore(s => s.theme)
  const lang = usePrefsStore(s => s.lang)
  const toggleEvent = (name: string, ch: 'email' | 'app' | 'sms') => { systemService.toggleEvent(name, ch); qc.invalidateQueries({ queryKey: ['notif-events'] }) }
  const saveNotif = () => {
    if (!chEmail && !chApp) { setRErr(t('مطلوب قناة افتراضية واحدة على الأقل')); return }
    const d = +retention
    if (!d || d < 7) { setRErr(t('أيام الاحتفاظ يجب أن تكون 7 على الأقل')); return }
    if (d > 365) { setRErr(t('أيام الاحتفاظ يجب أن تكون أقل من 365')); return }
    setRErr('')
    systemService.saveSettings('الإشعارات').then(() => toast.success(t('تم تحديث إعدادات الإشعارات بنجاح')))
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-2 shadow-sm">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={tab === v ? 'rounded-lg bg-foreground px-4 py-2 text-[13px] font-extrabold text-background' : 'rounded-lg px-4 py-2 text-[13px] font-bold text-muted-foreground hover:bg-accent'}>{t(l)}</button>)}
      </div>
      {tab === 'general' && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">{t('المظهر واللغة')}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div><Label>{t('وضع العرض')}</Label>
                <select className={selectCls + ' w-full'} value={theme} onChange={e => usePrefsStore.getState().setTheme(e.target.value as 'light' | 'dark')}>
                  <option value="light">{t('فاتح (أبيض)')}</option>
                  <option value="dark">{t('داكن (أسود)')}</option>
                </select></div>
              <div><Label>{t('لغة الواجهة')}</Label>
                <select className={selectCls + ' w-full'} value={lang} onChange={e => usePrefsStore.getState().setLang(e.target.value as 'ar' | 'en')}>
                  <option value="ar">{t('العربية')}</option>
                  <option value="en">English</option>
                </select></div>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">{t('الإعدادات العامة')}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div><Label>{t('اسم المنصة (3 – 100 حرف)')} <span className="text-destructive">*</span></Label><Input defaultValue="الدعم الرائدة" /></div>
              <div>
                <FileUploadWithPreview
                  label={t('شعار المنصة (PNG/SVG حتى 2MB)')}
                  files={logo}
                  accept=".png,.svg"
                  single
                  maxSizeMB={2}
                  onChange={setLogo}
                />
              </div>
              <div><Label>{t('العملة الافتراضية')}</Label><select className={selectCls + ' w-full'} defaultValue="SAR"><option value="SAR">{t('ريال سعودي')} (SAR)</option><option value="AED">{t('درهم إماراتي')}</option><option value="KWD">{t('دينار كويتي')}</option></select></div>
              <div><Label>{t('اللغة الافتراضية')}</Label><select className={selectCls + ' w-full'} defaultValue="ar"><option value="ar">{t('العربية')}</option><option value="en">English</option></select></div>
              <div className="md:col-span-2"><Button onClick={() => systemService.saveSettings('عام').then(() => toast.success(t('تم تحديث معاملات النظام بنجاح — تم تطبيق التغييرات فورًا')))}>{t('حفظ التغييرات')}</Button></div>
            </CardContent></Card>
        </div>
      )}
      {tab === 'orders' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('إعدادات الطلبات')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>{t('التأكيد التلقائي للطلبات')}</Label><select className={selectCls + ' w-full'} defaultValue="yes"><option value="yes">{t('نعم')}</option><option value="no">{t('لا (تأكيد يدوي)')}</option></select></div>
            <div><Label>{t('الحد الأقصى للقطع في الطلب')} (1 – 1000)</Label><Input type="number" defaultValue={100} min={1} max={1000} /></div>
            <div><Label>{t('طريقة الشحن الافتراضية')}</Label><select className={selectCls + ' w-full'} defaultValue="std"><option value="std">{t('الشحن القياسي')}</option><option value="exp">{t('الشحن السريع')}</option></select></div>
            <div className="md:col-span-2"><Button onClick={() => systemService.saveSettings('الطلبات').then(() => toast.success(t('تم تحديث معاملات النظام بنجاح — تم تطبيق التغييرات فورًا')))}>{t('حفظ التغييرات')}</Button></div>
          </CardContent></Card>
      )}
      {tab === 'inventory' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('المخزون وحدود التخزين')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div><Label>{t('حد التنبيه للمخزون المنخفض')} (1 – 1000)</Label><Input type="number" defaultValue={25} /></div>
            <div><Label>{t('تفعيل حجز المخزون')}</Label><select className={selectCls + ' w-full'} defaultValue="yes"><option value="yes">{t('نعم')}</option><option value="no">{t('لا')}</option></select></div>
            <div><Label>{t('الاعتماد التلقائي لإضافات أقل من')}</Label><Input type="number" defaultValue={0} /></div>
            <div><Label>{t('حد التخزين المجاني الافتراضي')} (0 – 1,000,000)</Label><Input type="number" defaultValue={60} /></div>
            <div><Label>{t('وحدة حد التخزين')}</Label><select className={selectCls + ' w-full'} defaultValue="m3"><option value="m3">{t('م³')}</option><option value="pallet">{t('مواقع طبلية')}</option><option value="units">{t('وحدات')}</option></select></div>
            <div><Label>{t('نسبة التنبيه التحذيري')} (50% – 100%)</Label><Input type="number" defaultValue={80} /></div>
            <div className="md:col-span-3"><Button onClick={() => systemService.saveSettings('المخزون').then(() => toast.success(t('تم تحديث إعدادات حد التخزين بنجاح')))}>{t('حفظ التغييرات')}</Button></div>
          </CardContent></Card>
      )}
      {tab === 'finance' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('السحب والفاتورة الشهرية وفوترة الخدمات')}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div><Label>{t('الحد الأدنى للسحب')} (1 – 10,000)</Label><Input type="number" defaultValue={100} /></div>
            <div><Label>{t('رسوم معالجة السحب % (0 – 50)')}</Label><Input type="number" defaultValue={1.5} /></div>
            <div><Label>{t('فائدة رصيد المحفظة')}</Label><select className={selectCls + ' w-full'} defaultValue="no"><option value="no">{t('لا')}</option><option value="yes">{t('نعم')}</option></select></div>
            <div><Label>{t('محاولات إعادة الخصم')} (1 – 7)</Label><Input type="number" defaultValue={3} /></div>
            <div><Label>{t('الفاصل بين المحاولات بالأيام')} (1 – 7)</Label><Input type="number" defaultValue={2} /></div>
            <div><Label>{t('الإلغاء التلقائي بعد فشل المحاولات')}</Label><select className={selectCls + ' w-full'} defaultValue="no"><option value="no">{t('لا')}</option><option value="yes">{t('نعم')}</option></select></div>
            <div><Label>{t('يوم توليد الفاتورة')} (1 – 28)</Label><Input type="number" defaultValue={1} /></div>
            <div><Label>{t('أيام استحقاق الفاتورة')} (1 – 90)</Label><Input type="number" defaultValue={15} /></div>
            <div><Label>{t('الإرسال التلقائي عبر البريد')}</Label><select className={selectCls + ' w-full'} defaultValue="yes"><option value="yes">{t('نعم')}</option><option value="no">{t('لا')}</option></select></div>
            <div><Label>{t('نسبة الضريبة')} (0 – 100)</Label><Input type="number" defaultValue={15} /></div>
            <div><Label>{t('رسوم تنفيذ الطلب الواحد')}</Label><Input type="number" defaultValue={5} /></div>
            <div><Label>{t('رسوم تجاوز التخزين لكل وحدة')}</Label><Input type="number" defaultValue={2} /></div>
            <div className="md:col-span-3"><Button onClick={() => systemService.saveSettings('المالية').then(() => toast.success(t('تم تحديث إعدادات الفواتير وفوترة الخدمات بنجاح')))}>{t('حفظ التغييرات')}</Button></div>
          </CardContent></Card>
      )}
      {tab === 'notif' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('التحكم بقنوات الإشعارات لكل حدث')}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div><Label>{t('القنوات الافتراضية للأحداث الجديدة')} <span className="text-destructive">*</span></Label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={chEmail} onChange={e => setChEmail(e.target.checked)} /> {t('بريد إلكتروني')}</label>
                  <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={chApp} onChange={e => setChApp(e.target.checked)} /> {t('داخل التطبيق')}</label>
                </div></div>
              <div><Label>{t('أيام الاحتفاظ بالإشعارات (7 – 365)')}</Label><Input type="number" value={retention} onChange={e => setRetention(e.target.value)} /></div>
              <div><Label>{t('صوت الإشعار الفوري')}</Label><select className={selectCls + ' w-full'} defaultValue="no"><option value="no">{t('لا')}</option><option value="yes">{t('نعم')}</option></select></div>
            </div>
            {rErr && <p className="mb-2 text-xs font-bold text-destructive">{rErr}</p>}
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('الحدث')}</th><th className="p-2 font-extrabold">{t('بريد إلكتروني')}</th><th className="p-2 font-extrabold">{t('داخل التطبيق')}</th><th className="p-2 font-extrabold">SMS</th><th className="p-2 text-start font-extrabold">{t('القالب المرتبط')}</th></tr></thead>
                <tbody>{events?.map(e => (
                  <tr key={e.name} className="border-b">
                    <td className="p-2 font-bold">{t(e.name)}</td>
                    <td className="p-2 text-center"><input type="checkbox" checked={e.email} onChange={() => toggleEvent(e.name, 'email')} /></td>
                    <td className="p-2 text-center"><input type="checkbox" checked={e.app} onChange={() => toggleEvent(e.name, 'app')} /></td>
                    <td className="p-2 text-center"><input type="checkbox" checked={e.sms} onChange={() => toggleEvent(e.name, 'sms')} /></td>
                    <td className="p-2 text-xs font-semibold text-muted-foreground">{t(e.tpl)}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
            <div className="mt-4"><Button onClick={saveNotif}>{t('حفظ التغييرات')}</Button></div>
          </CardContent></Card>
      )}
      {tab === 'templates' && <TemplatesSection />}
      {tab === 'integrations' && (
        <Card><CardHeader><CardTitle className="text-sm">{t('إدارة التكاملات')}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('التكامل')}</th><th className="p-2 text-start font-extrabold">{t('النوع')}</th><th className="p-2 text-start font-extrabold">{t('المزود')}</th><th className="p-2 text-start font-extrabold">API</th><th className="p-2 text-start font-extrabold">{t('الحالة الصحية')}</th><th className="p-2 text-start font-extrabold">{t('آخر مزامنة')}</th><th className="p-2" /></tr></thead>
              <tbody>{integrations?.map((i) => (
                <tr key={i.name} className="border-b">
                  <td className="p-2 font-bold">{t(i.name)}</td><td className="p-2">{t(i.type)}</td><td className="p-2">{t(i.provider)}</td><td dir="ltr" className="p-2 text-xs">{i.url}</td><td className="p-2"><StatusBadge value={i.health} /></td><td className="p-2 text-xs">{i.sync}</td>
                  <td className="p-2"><Button variant="outline" size="sm" onClick={() => i.health === 'يعمل' ? toast.success(t('نتيجة الاختبار: الاتصال ناجح — API متاح والبيانات صالحة')) : toast.error(t('نتيجة الاختبار: فشل الاتصال — تحقق من مفتاح API'))}>{t('اختبار الاتصال')}</Button></td>
                </tr>))}
              </tbody>
            </table>
          </CardContent></Card>
      )}
    </div>
  )
}
function TemplatesSection() {
  const qc = useQueryClient()
  const t = useT()
  const { data } = useQuery({ queryKey: ['email-templates'], queryFn: () => systemExtraService.templates() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [form, setForm] = useState({ name: '', type: 'تحديث طلب', event: '', subject: '', body: '', status: 'نشط' as 'نشط' | 'غير نشط' })
  const [tErr, setTErr] = useState('')
  const save = useMutation({ mutationFn: () => systemExtraService.saveTemplate(form, editing?.id), onSuccess: () => { toast.success(t(editing ? 'تم تحديث القالب بنجاح' : 'تم إنشاء القالب بنجاح')); qc.invalidateQueries({ queryKey: ['email-templates'] }); setOpen(false) }, onError: e => setTErr((e as Error).message) })
  const ev = EVENTS.find(e => e.name === form.event)
  const submit = () => {
    if (!form.name.trim()) { setTErr(t('اسم القالب مطلوب')); return }
    if (!form.event) { setTErr(t('الحدث الإشعاري مطلوب')); return }
    if (!form.subject.trim()) { setTErr(t('موضوع البريد مطلوب')); return }
    if (!form.body.trim()) { setTErr(t('نص القالب مطلوب')); return }
    setTErr('')
    save.mutate()
  }
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">{t('إدارة قوالب البريد الإلكتروني (ربط الأحداث)')}</CardTitle>
      <Button size="sm" onClick={() => { setEditing(null); setForm({ name: '', type: 'تحديث طلب', event: '', subject: '', body: '', status: 'نشط' }); setTErr(''); setOpen(true) }}>{t('إنشاء قالب')}</Button></CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="p-2 text-start font-extrabold">{t('اسم القالب')}</th><th className="p-2 text-start font-extrabold">{t('النوع')}</th><th className="p-2 text-start font-extrabold">{t('الحدث المرتبط')}</th><th className="p-2 text-start font-extrabold">{t('الحالة')}</th><th className="p-2" /></tr></thead>
            <tbody>{(data ?? []).map(item => (
              <tr key={item.id} className="border-b">
                <td className="p-2 font-bold">{t(item.name)}</td><td className="p-2">{t(item.type)}</td><td className="p-2">{t(item.event)}</td><td className="p-2"><StatusBadge value={item.status} /></td>
                <td className="p-2"><Button size="sm" variant="outline" onClick={() => { setEditing(item); setForm({ name: item.name, type: item.type, event: item.event, subject: item.subject, body: item.body, status: item.status }); setTErr(''); setOpen(true) }}>{t('تعديل')}</Button></td>
              </tr>))}
            </tbody>
          </table>
        </div>
        <Modal open={open} onClose={() => setOpen(false)} wide title={editing ? t('تعديل قالب') + ' — ' + editing.id : t('إنشاء قالب بريد')}
          footer={<><Button variant="outline" onClick={() => setOpen(false)}>{t('إلغاء')}</Button><Button disabled={save.isPending} onClick={submit}>{t('حفظ القالب')}</Button></>}>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>{t('اسم القالب')} <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>{t('نوع القالب')}</Label><select className={selectCls + ' w-full'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{['تحديث طلب', 'إشعار الفاتورة', 'اعتماد', 'رفض', 'تنبيه'].map(tType => <option key={tType} value={tType}>{t(tType)}</option>)}</select></div>
            <div><Label>{t('الحدث الإشعاري المرتبط')} <span className="text-destructive">*</span></Label>
              <select className={selectCls + ' w-full'} value={form.event} onChange={e => setForm(f => ({ ...f, event: e.target.value }))}>
                <option value="">{t('اختر الحدث...')}</option>
                {EVENTS.map(e => <option key={e.name} value={e.name}>{t(e.name)}</option>)}
              </select></div>
            <div><Label>{t('حالة القالب')}</Label>
              <div className="flex gap-5 pt-2">
                <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.status === 'نشط'} onChange={() => setForm(f => ({ ...f, status: 'نشط' }))} /> {t('نشط')}</label>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.status === 'غير نشط'} onChange={() => setForm(f => ({ ...f, status: 'غير نشط' }))} /> {t('غير نشط')}</label>
              </div></div>
            <div className="md:col-span-2"><Label>{t('موضوع البريد')} <span className="text-destructive">*</span></Label><Input dir="ltr" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div className="md:col-span-2"><Label>{t('نص القالب (بالمتغيرات الديناميكية)')} <span className="text-destructive">*</span></Label><Textarea rows={5} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
            {ev && <div className="md:col-span-2"><p className="mb-1 text-xs font-extrabold text-muted-foreground">{t('المتغيرات الديناميكية المتاحة لهذا الحدث (اضغط للإدراج):')}</p>
              <div className="flex flex-wrap gap-1">{ev.vars.map(v => <button key={v} type="button" dir="ltr" onClick={() => setForm(f => ({ ...f, body: f.body + ' ' + v }))} className="rounded-md border bg-card px-2 py-1 text-[11px] font-bold hover:bg-accent">{v}</button>)}</div></div>}
          </div>
          {tErr && <p className="mt-2 text-xs font-bold text-destructive">{tErr}</p>}
        </Modal>
      </CardContent></Card>
  )
}


