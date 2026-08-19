import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/brand-logo'
import { useAuthStore } from '@/store/auth-store'
import { usePrefsStore } from '@/store/prefs-store'
import { useT } from '@/lib/i18n'
import { db } from '@/mocks/db'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

export const DEMO_ADMIN = { email: 'admin@daam.sa', pwd: '123456' }
export const DEMO_MERCHANT = { email: 'merchant@daam.sa', pwd: '123456' }

export function fixDemoAccounts() {
  try {
    const raw = localStorage.getItem('daam-db-v1')
    if (raw) {
      const db = JSON.parse(raw)
      if (db.admins?.[0]) { db.admins[0].email = DEMO_ADMIN.email; db.admins[0].pwd = DEMO_ADMIN.pwd }
      if (db.merchants?.[0]) { db.merchants[0].email = DEMO_MERCHANT.email; db.merchants[0].pwd = DEMO_MERCHANT.pwd }
      localStorage.setItem('daam-db-v1', JSON.stringify(db))
    }
    localStorage.setItem('daam-merchant-pwd', JSON.stringify({ [DEMO_MERCHANT.email]: DEMO_MERCHANT.pwd }))
  } catch { /* ignore */ }
}

function Field({ label, type, value, onChange, ph, hint }: { label: string; type?: string; value: string; onChange: (v: string) => void; ph: string; hint?: string }) {
  const t = useT()
  const [show, setShow] = useState(false)
  const isPwd = type === 'password'
  return (
    <div>
      <Label className="text-[13px] font-extrabold">{label}</Label>
      <div className="relative mt-1.5">
        <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {isPwd || type === 'text' ? <Lock className="size-4" /> : <Mail className="size-4" />}
        </span>
        <Input
          type={isPwd ? (show ? 'text' : 'password') : type ?? 'email'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={ph}
          className={`bg-muted/40 text-start ${isPwd ? 'ps-10 pe-10' : 'ps-10 pe-3'}`}
        />
        {isPwd && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow(s => !s)}
            className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={show ? t('إخفاء كلمة المرور') : t('إظهار كلمة المرور')}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{hint}</p>}
    </div>
  )
}

function AuthShell({ children, tagline }: { children: React.ReactNode; tagline: string }) {
  const lang = usePrefsStore(s => s.lang)
  const setLang = usePrefsStore(s => s.setLang)
  const t = useT()
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex justify-center lg:hidden"><BrandLogo className="h-24 w-auto" /></div>
            <button
              type="button"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="ms-auto rounded-full border bg-card px-3 py-1.5 text-[11px] font-black text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t('تغيير اللغة')}
            >
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>
          {children}
        </div>
      </div>
      <div className="hidden flex-col items-center justify-center gap-6 bg-black p-10 lg:flex">
        <BrandLogo variant="light" className="h-40 w-auto" />
        <p className="max-w-xs text-center text-sm font-semibold text-white/60">{tagline}</p>
      </div>
    </div>
  )
}

export function LoginPage({ portal }: { portal: 'admin' | 'merchant' }) {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const demo = portal === 'admin' ? DEMO_ADMIN : DEMO_MERCHANT
  const t = useT()
  const [forgot, setForgot] = useState(false)
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  if (forgot) return <ForgotPage portal={portal} onBack={() => setForgot(false)} />
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const r = login(email, pwd, portal)
    if (!r.ok) { setErr(r.error ?? t('البريد الإلكتروني أو كلمة المرور غير صحيحة')); return }
    toast.success(t('تم تسجيل الدخول بنجاح — أهلاً بك'))
    navigate(portal === 'admin' ? '/' : '/merchant')
  }
  return (
    <AuthShell tagline={portal === 'admin' ? t('نظام إدارة المستودعات ومتابعة التجار') : t('بوابة التاجر للمنتجات والطلبات وإدارة المحفظة')}>
      <div>
        <h1 className="text-2xl font-black">{t('تسجيل الدخول إلى حسابك')}</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('مرحبًا بعودتك')} — {t('تسجيل الدخول إلى حسابك')} {portal === 'admin' ? t('نظام عمليات المستودع ومتابعة الأعمال') : t('بوابة التاجر ولوحة متابعة الأعمال')}.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('المستخدم / البريد الإلكتروني')} value={email} onChange={setEmail} ph={t('البريد الإلكتروني')} hint={t('أدخل بريدك الإلكتروني')} />
        <Field label={t('كلمة المرور')} type="password" value={pwd} onChange={setPwd} ph="************" hint={t('كلمة المرور')} />
        {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{err}</p>}
        <div className="flex items-center justify-between text-[13px] font-bold">
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> {t('تذكرني')}</label>
          <button type="button" className="underline" onClick={() => setForgot(true)}>{t('نسيت كلمة المرور؟')}</button>
        </div>
        <Button type="submit" className="w-full">{t('تسجيل الدخول')}</Button>
      </form>
      <div className="rounded-xl border border-dashed bg-muted/40 p-3 text-center">
        <p className="text-[11px] font-extrabold text-muted-foreground">{t('بيانات تجريبية')}</p>
        <p dir="ltr" className="mt-1 text-[13px] font-black">{demo.email} — {demo.pwd}</p>
        <button type="button" className="mt-1 text-[11px] font-bold underline" onClick={() => { setEmail(demo.email); setPwd(demo.pwd); setErr('') }}>{t('إكمال تلقائي')}</button>
      </div>
    </AuthShell>
  )
}

export function ForgotPage({ portal, onBack }: { portal: 'admin' | 'merchant'; onBack?: () => void }) {
  const navigate = useNavigate()
  const t = useT()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [sent, setSent] = useState('')
  const [err, setErr] = useState('')
  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr(t('يرجى إدخال بريد إلكتروني صحيح')); return }
    setErr('')
    const c = String(Math.floor(100000 + Math.random() * 900000))
    setSent(c)
    setStep(2)
    toast.success(t('تم إرسال رمز التحقق إلى بريدك الإلكتروني'))
  }
  const reset = (e: React.FormEvent) => {
    e.preventDefault()
    if (code !== sent && code !== '123456') { setErr(t('رمز التحقق غير صحيح')); return }
    if (pwd.length < 6) { setErr(t('يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل')); return }
    if (pwd !== pwd2) { setErr(t('كلمتا المرور غير متطابقتين')); return }
    setErr('')
    const list = (portal === 'admin' ? db.admins : db.merchants) as Array<{ email: string; pwd?: string }>
    const u = list.find(x => x.email.toLowerCase() === email.trim().toLowerCase()) ?? list[0]
    if (u) u.pwd = pwd
    if (portal === 'merchant') {
      try { const map = JSON.parse(localStorage.getItem('daam-merchant-pwd') ?? '{}') as Record<string, string>; map[email.trim().toLowerCase()] = pwd; localStorage.setItem('daam-merchant-pwd', JSON.stringify(map)) } catch { /* ignore */ }
    }
    toast.success(t('تم تغيير كلمة المرور بنجاح — يرجى تسجيل الدخول الآن'))
    navigate(portal === 'admin' ? '/login' : '/merchant/login')
  }
  return (
    <AuthShell tagline={t('إعادة تعيين كلمة المرور')}>
      <div>
        <h1 className="text-2xl font-black">{t('إعادة تعيين كلمة المرور')}</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{step === 1 ? t('أدخل بريدك الإلكتروني المسجل') : t('أدخل رمز التحقق وكلمة المرور الجديدة.')}</p>
      </div>
      {step === 1 ? (
        <form onSubmit={send} className="space-y-4">
          <Field label={t('المستخدم / البريد الإلكتروني')} value={email} onChange={setEmail} ph={t('البريد الإلكتروني')} hint={t('أدخل بريدك الإلكتروني')} />
          {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{err}</p>}
          <Button type="submit" className="w-full">{t('إرسال رمز التحقق')}</Button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <div className="rounded-xl border border-dashed bg-muted/40 p-3 text-center text-[12px] font-bold text-muted-foreground">{t('الوضع التجريبي: رمز التحقق المرسل هو ')}<span dir="ltr" className="font-black text-foreground">{sent}</span>{t(' (أو استخدم 123456)')}</div>
          <Field label={t('رمز التحقق')} type="text" value={code} onChange={setCode} ph="******" />
          <Field label={t('كلمة مرور جديدة')} type="password" value={pwd} onChange={setPwd} ph="********" />
          <Field label={t('تأكيد كلمة المرور')} type="password" value={pwd2} onChange={setPwd2} ph="********" />
          {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{err}</p>}
          <Button type="submit" className="w-full">{t('إعادة تعيين كلمة المرور')}</Button>
        </form>
      )}
      <button type="button" className="w-full text-center text-[13px] font-bold underline" onClick={() => (onBack ? onBack() : navigate(portal === 'admin' ? '/login' : '/merchant/login'))}>{t('العودة لتسجيل الدخول')}</button>
    </AuthShell>
  )
}

fixDemoAccounts()
