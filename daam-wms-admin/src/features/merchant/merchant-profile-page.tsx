import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Modal, selectCls } from '@/components/common'
import { useAuthStore } from '@/store/auth-store'
import { merchantPortalService } from '@/services/merchant-portal.service'
import { initials } from '@/lib/utils'
import { useState } from 'react'
const BANKS = ['مصرف الراجحي', 'البنك الأهلي السعودي', 'بنك الرياض', 'مصرف الإنماء', 'بنك البلاد']
const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const PWD_MSG = 'يجب ألا تقل كلمة المرور عن 8 أحرف، ويجب أن تحتوي على حروف كبيرة وصغيرة وأرقام ورموز خاصة'
export default function MerchantProfilePage() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const { data: p, isLoading } = useQuery({ queryKey: ['merchant-profile', user?.id], queryFn: () => merchantPortalService.profile(user!.id) })
  const [editOpen, setEditOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pErr, setPErr] = useState('')
  const openEdit = () => {
    if (!p) return
    setForm({ name: p.name, phone: p.phone, store: p.store, nationalId: p.nationalId, address: p.address, bank: p.bank, iban: p.iban, gender: p.gender, notes: p.notes })
    setFiles(p.attachments)
    setErr('')
    setEditOpen(true)
  }
  const onImage = (f: File | null) => {
    if (!f) return
    if (!/\.(jpg|png|jpeg)$/i.test(f.name)) { toast.error('امتداد الصورة غير صالح ، يرجى تحميل JPG, PNG, JPEG.'); return }
    if (f.size > 5 * 1024 * 1024) { toast.error('الحد الأقصى لحجم الصورة هو 5 ميجابايت ، يرجى استخدام صورة أصغر'); return }
    toast.success('تم إرفاق الصورة بنجاح')
  }
  const onAttach = (list: FileList | null) => {
    if (!list) return
    const arr = Array.from(list)
    if (files.length + arr.length > 8) { toast.error('الحد الأقصى 8 مرفقات'); return }
    for (const f of arr) {
      if (!/\.(jpg|png|jpeg|pdf)$/i.test(f.name)) { toast.error('امتداد الملف غير صالح ، يرجى تحميل JPG, PNG, JPEG, PDF.'); return }
      if (f.size > 5 * 1024 * 1024) { toast.error('الحد الأقصى لحجم الملف هو 5 ميجابايت ، يرجى استخدام ملف أصغر'); return }
    }
    setFiles(s => [...s, ...arr.map(f => f.name)])
  }
  const save = () => {
    if (!form.name?.trim()) { setErr('الاسم الكامل مطلوب'); return }
    if (form.name.length < 3 || form.name.length > 50) { setErr('يجب أن يتراوح الاسم الكامل بين 3 و 50 حرفًا'); return }
    if (!form.phone) { setErr('رقم الهاتف مطلوب'); return }
    if (!/^\d{11}$/.test(form.phone)) { setErr('صيغة رقم الهاتف غير صحيحة'); return }
    if (!form.store?.trim()) { setErr('اسم المتجر مطلوب'); return }
    if (!form.nationalId) { setErr('رقم الهوية الوطنية مطلوب'); return }
    if (!/^\d{1,15}$/.test(form.nationalId)) { setErr('يجب أن يكون رقم الهوية الوطنية أقل من 15 رقمًا'); return }
    if (!form.address) { setErr('العنوان الوطني المختصر مطلوب'); return }
    if (!/^[A-Za-z]{4}\d{4}$/.test(form.address)) { setErr('يجب أن يتكون العنوان الوطني المختصر من 4 حروف تليها 4 أرقام'); return }
    if (!form.bank) { setErr('اسم المصرف أو البنك مطلوب'); return }
    if (!form.iban) { setErr('رقم الايبان مطلوب'); return }
    if (!/^[A-Z]{2}\d{22}$/.test(form.iban)) { setErr('يجب أن يتكون رقم الايبان من حرفين تليهما 22 رقمًا'); return }
    if (!form.gender) { setErr('الجنس مطلوب'); return }
    if ((form.notes ?? '').length > 500) { setErr('الملاحظات يجب أن تكون أقل من 500 حرف'); return }
    setErr('')
    const [first, ...rest] = (form.name ?? '').trim().split(' ')
    merchantPortalService.updateProfile(user!.id, { first, last: rest.join(' ') || first, phone: form.phone, store: form.store, nationalId: form.nationalId, address: form.address.toUpperCase(), bank: form.bank, iban: form.iban.toUpperCase(), gender: form.gender, notes: form.notes, attachments: files }).then(() => {
      toast.success('تم تحديث الملف الشخصي بنجاح')
      qc.invalidateQueries({ queryKey: ['merchant-profile'] })
      setEditOpen(false)
    })
  }
  const changePwd = () => {
    if (!pwd.current) { setPErr('كلمة المرور الحالية مطلوبة'); return }
    if (!pwd.next) { setPErr('كلمة المرور الجديدة مطلوبة'); return }
    if (!PWD_RE.test(pwd.next)) { setPErr(PWD_MSG); return }
    if (!pwd.confirm) { setPErr('تأكيد كلمة المرور مطلوب'); return }
    if (!PWD_RE.test(pwd.confirm)) { setPErr(PWD_MSG); return }
    if (pwd.confirm !== pwd.next) { setPErr('يجب أن يتطابق تأكيد كلمة المرور مع كلمة المرور الجديدة'); return }
    setPErr('')
    merchantPortalService.changePassword(user!.email, pwd.current, pwd.next).then(() => { toast.success('تم تغيير كلمة المرور بنجاح'); setPwdOpen(false); setPwd({ current: '', next: '', confirm: '' }) }).catch(e => setPErr((e as Error).message))
  }
  if (isLoading || !p) return <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-sm">الملف الشخصي</CardTitle></CardHeader><CardContent>
        <div className="mb-5 flex items-center gap-4">
          <Avatar className="size-16 rounded-2xl"><AvatarFallback className="rounded-2xl bg-foreground text-xl font-black text-background">{initials(p.name)}</AvatarFallback></Avatar>
          <div><p className="text-lg font-black">{p.name}</p><p className="text-xs font-bold text-muted-foreground">{p.store} — تاجر</p></div>
          <div className="ms-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>تعديل الملف الشخصي</Button>
            <Button size="sm" onClick={() => { setPwdOpen(true); setPErr('') }}>تغيير كلمة المرور</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([['البريد الإلكتروني', p.email], ['رقم الجوال', p.phone], ['اسم المتجر', p.store], ['رقم الهوية الوطنية', p.nationalId], ['العنوان الوطني المختصر', p.address], ['اسم المصرف أو البنك', p.bank], ['رقم الايبان', <span key="i" dir="ltr">{p.iban}</span>], ['الجنس', p.gender]] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
        </div>
        <div className="mt-3 rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">الملاحظات والبيانات الإضافية</p><p className="text-[13px] font-extrabold">{p.notes || '—'}</p></div>
        <div className="mt-3"><p className="mb-1 text-[11px] font-bold text-muted-foreground">المرفقات</p>
          <div className="flex flex-wrap gap-2">{p.attachments.map(a => <span key={a} className="rounded-md border bg-card px-2 py-1 text-[11px] font-bold">📎 {a}</span>)}</div></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">بيانات الحساب</CardTitle></CardHeader><CardContent className="space-y-3">
        {[['حالة الحساب', 'نشط'], ['تاريخ الانضمام', '2024-03-12'], ['آخر تسجيل دخول', 'اليوم']].map(([k, v]) => (
          <div key={k} className="rounded-lg border p-3"><p className="text-[13px] font-bold">{k}</p><p className="text-[11px] font-semibold text-muted-foreground">{v}</p></div>))}
      </CardContent></Card>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} wide title="تعديل الملف الشخصي"
        footer={<><Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button><Button onClick={save}>حفظ التغييرات</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>صورة التاجر (JPG/PNG/JPEG حتى 5MB)</Label><Input type="file" accept=".jpg,.png,.jpeg" onChange={e => onImage(e.target.files?.[0] ?? null)} /></div>
          <div><Label>الاسم الكامل (3 – 50 حرفًا) <span className="text-destructive">*</span></Label><Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>رقم الهاتف (11 رقمًا) <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={11} value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} /></div>
          <div><Label>اسم المتجر <span className="text-destructive">*</span></Label><Input value={form.store ?? ''} onChange={e => setForm(f => ({ ...f, store: e.target.value }))} /></div>
          <div><Label>رقم الهوية الوطنية (حتى 15 رقمًا) <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={15} value={form.nationalId ?? ''} onChange={e => setForm(f => ({ ...f, nationalId: e.target.value.replace(/\D/g, '') }))} /></div>
          <div><Label>العنوان الوطني المختصر (4 حروف + 4 أرقام) <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={8} value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} placeholder="RYDH1234" /></div>
          <div><Label>اسم المصرف أو البنك <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.bank ?? ''} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}>
              <option value="">اختر البنك...</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select></div>
          <div><Label>رقم الايبان (حرفان + 22 رقمًا) <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={24} value={form.iban ?? ''} onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase().replace(/\s/g, '') }))} placeholder="SA0000000000000000000000" /></div>
          <div><Label>الجنس <span className="text-destructive">*</span></Label>
            <div className="flex gap-5 pt-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.gender === 'ذكر'} onChange={() => setForm(f => ({ ...f, gender: 'ذكر' }))} /> ذكر</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.gender === 'أنثى'} onChange={() => setForm(f => ({ ...f, gender: 'أنثى' }))} /> أنثى</label>
            </div></div>
          <div className="md:col-span-2"><Label>الملاحظات والبيانات الإضافية (اختياري — 500 حرف)</Label><Textarea maxLength={500} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="md:col-span-2"><Label>المرفقات (JPG/PNG/JPEG/PDF حتى 5MB — حتى 8 ملفات)</Label><Input type="file" multiple accept=".jpg,.png,.jpeg,.pdf" onChange={e => onAttach(e.target.files)} />
            {files.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{files.map(a => <span key={a} className="rounded-md border bg-card px-2 py-1 text-[11px] font-bold">📎 {a}</span>)}</div>}</div>
        </div>
        {err && <p className="mt-2 text-xs font-bold text-destructive">{err}</p>}
      </Modal>
      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title="تغيير كلمة المرور"
        footer={<><Button variant="outline" onClick={() => setPwdOpen(false)}>إلغاء</Button><Button onClick={changePwd}>تغيير كلمة المرور</Button></>}>
        <div className="grid gap-3">
          <div><Label>كلمة المرور الحالية <span className="text-destructive">*</span></Label><Input dir="ltr" type="password" value={pwd.current} onChange={e => setPwd(x => ({ ...x, current: e.target.value }))} /></div>
          <div><Label>كلمة المرور الجديدة <span className="text-destructive">*</span></Label><Input dir="ltr" type="password" value={pwd.next} onChange={e => setPwd(x => ({ ...x, next: e.target.value }))} /></div>
          <div><Label>تأكيد كلمة المرور <span className="text-destructive">*</span></Label><Input dir="ltr" type="password" value={pwd.confirm} onChange={e => setPwd(x => ({ ...x, confirm: e.target.value }))} /></div>
        </div>
        {pErr && <p className="mt-2 text-xs font-bold text-destructive">{pErr}</p>}
      </Modal>
    </div>
  )
}
