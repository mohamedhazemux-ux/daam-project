import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/brand-logo'
import { useAuthStore } from '@/store/auth-store'
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
  const [show, setShow] = useState(false)
  const isPwd = type === 'password'
  return (
    <div>
      <Label className="text-[13px] font-extrabold">{label}</Label>
      <div className="relative mt-1.5">
        <Input
          type={isPwd ? (show ? 'text' : 'password') : type ?? 'email'}
          dir="rtl"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={ph}
          className={`bg-muted/40 text-right ${isPwd ? 'pl-10 pr-10' : 'pr-10'}`}
        />
        {isPwd ? (
          <>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Lock className="size-4" />
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShow(s => !s)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {type === 'text' ? <Lock className="size-4" /> : <Mail className="size-4" />}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{hint}</p>}
    </div>
  )
}

function AuthShell({ children, tagline }: { children: React.ReactNode; tagline: string }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Form Container (Right side in RTL layout) */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="mb-2 flex justify-center lg:hidden"><BrandLogo className="h-24 w-auto" /></div>
          {children}
        </div>
      </div>
      {/* Black Branding Container (Left side in RTL layout) */}
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
  const [forgot, setForgot] = useState(false)
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  if (forgot) return <ForgotPage portal={portal} onBack={() => setForgot(false)} />
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const r = login(email, pwd, portal)
    if (!r.ok) { setErr(r.error ?? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'); return }
    toast.success('تم تسجيل الدخول بنجاح — مرحبًا بك')
    navigate(portal === 'admin' ? '/' : '/merchant')
  }
  return (
    <AuthShell tagline={portal === 'admin' ? 'منصة إدارة المستودعات ومتابعة التجار' : 'بوابة التجار لإدارة المنتجات والطلبات والمحفظة'}>
      <div>
        <h1 className="text-2xl font-black">قم بتسجيل الدخول لحسابك</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">مرحبًا بعودتك — قم بتسجيل الدخول للوصول إلى {portal === 'admin' ? 'نظام إدارة المستودعات ومتابعة أعمالك' : 'بوابة التجار ومتابعة أعمالك'}.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="البريد الالكتروني" value={email} onChange={setEmail} ph="البريد الالكتروني" hint="قم بإدخال البريد الالكتروني الخاص بك" />
        <Field label="كلمة المرور" type="password" value={pwd} onChange={setPwd} ph="************" hint="قم بإدخال كلمة المرور الخاصة بك" />
        {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{err}</p>}
        <div className="flex items-center justify-between text-[13px] font-bold">
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> تذكرني</label>
          <button type="button" className="underline" onClick={() => setForgot(true)}>هل نسيت كلمة المرور؟</button>
        </div>
        <Button type="submit" className="w-full">تسجيل الدخول</Button>
      </form>
      <div className="rounded-xl border border-dashed bg-muted/40 p-3 text-center">
        <p className="text-[11px] font-extrabold text-muted-foreground">بيانات الدخول التجريبية</p>
        <p dir="ltr" className="mt-1 text-[13px] font-black">{demo.email} — {demo.pwd}</p>
        <button type="button" className="mt-1 text-[11px] font-bold underline" onClick={() => { setEmail(demo.email); setPwd(demo.pwd); setErr('') }}>تعبئة تلقائية</button>
      </div>
    </AuthShell>
  )
}

export function ForgotPage({ portal, onBack }: { portal: 'admin' | 'merchant'; onBack?: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [sent, setSent] = useState('')
  const [err, setErr] = useState('')
  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('يرجى إدخال بريد إلكتروني صالح'); return }
    setErr('')
    const c = String(Math.floor(100000 + Math.random() * 900000))
    setSent(c)
    setStep(2)
    toast.success('تم إرسال رمز التحقق إلى بريدك الإلكتروني')
  }
  const reset = (e: React.FormEvent) => {
    e.preventDefault()
    if (code !== sent && code !== '123456') { setErr('رمز التحقق غير صحيح'); return }
    if (pwd.length < 6) { setErr('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف'); return }
    if (pwd !== pwd2) { setErr('كلمتا المرور غير متطابقتين'); return }
    setErr('')
    const list = (portal === 'admin' ? db.admins : db.merchants) as Array<{ email: string; pwd?: string }>
    const u = list.find(x => x.email.toLowerCase() === email.trim().toLowerCase()) ?? list[0]
    if (u) u.pwd = pwd
    if (portal === 'merchant') {
      try { const map = JSON.parse(localStorage.getItem('daam-merchant-pwd') ?? '{}') as Record<string, string>; map[email.trim().toLowerCase()] = pwd; localStorage.setItem('daam-merchant-pwd', JSON.stringify(map)) } catch { /* ignore */ }
    }
    toast.success('تم تغيير كلمة المرور بنجاح — سجّل دخولك الآن')
    navigate(portal === 'admin' ? '/login' : '/merchant/login')
  }
  return (
    <AuthShell tagline="استعادة كلمة المرور تتم عبر البريد الإلكتروني المسجل">
      <div>
        <h1 className="text-2xl font-black">استعادة كلمة المرور</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{step === 1 ? 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رمز التحقق.' : 'أدخل رمز التحقق وكلمة المرور الجديدة.'}</p>
      </div>
      {step === 1 ? (
        <form onSubmit={send} className="space-y-4">
          <Field label="البريد الالكتروني" value={email} onChange={setEmail} ph="البريد الالكتروني" hint="قم بإدخال البريد الالكتروني الخاص بك" />
          {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{err}</p>}
          <Button type="submit" className="w-full">إرسال رمز التحقق</Button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <div className="rounded-xl border border-dashed bg-muted/40 p-3 text-center text-[12px] font-bold text-muted-foreground">وضع التجربة: رمز التحقق المرسل هو <span dir="ltr" className="font-black text-foreground">{sent}</span> (أو استخدم 123456)</div>
          <Field label="رمز التحقق" type="text" value={code} onChange={setCode} ph="******" />
          <Field label="كلمة المرور الجديدة" type="password" value={pwd} onChange={setPwd} ph="********" />
          <Field label="تأكيد كلمة المرور" type="password" value={pwd2} onChange={setPwd2} ph="********" />
          {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs font-bold text-destructive">{err}</p>}
          <Button type="submit" className="w-full">تغيير كلمة المرور</Button>
        </form>
      )}
      <button type="button" className="w-full text-center text-[13px] font-bold underline" onClick={() => (onBack ? onBack() : navigate(portal === 'admin' ? '/login' : '/merchant/login'))}>العودة إلى تسجيل الدخول</button>
    </AuthShell>
  )
}

fixDemoAccounts()
