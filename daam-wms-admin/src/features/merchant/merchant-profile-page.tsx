import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AttachmentBadgeList, FileUploadWithPreview, Modal, selectCls } from '@/components/common'
import { useAuthStore } from '@/store/auth-store'
import { merchantPortalService } from '@/services/merchant-portal.service'
import { initials, arDate } from '@/lib/utils'
import { useState } from 'react'
const BANKS = ['مصرف الراجحي', 'البنك الأهلي السعودي', 'بنك الرياض', 'مصرف الإنماء', 'بنك البلاد']
const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const PWD_MSG = 'يجب ألا تقل كلمة المرور عن 8 أحرف، ويجب أن تحتوي على حروف كبيرة وصغيرة وأرقام ورموز خاصة'
import { useT } from '@/lib/i18n'

export default function MerchantProfilePage() {
  const t = useT()
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
    if (!/\.(jpg|png|jpeg)$/i.test(f.name)) { toast.error(t('امتداد الصورة غير صالح ، يرجى تحميل JPG, PNG, JPEG.')); return }
    if (f.size > 5 * 1024 * 1024) { toast.error(t('الحد الأقصى لحجم الصورة هو 5 ميجابايت ، يرجى استخدام صورة أصغر')); return }
    toast.success(t('تم إرفاق الصورة بنجاح'))
  }
  const save = () => {
    if (!form.name?.trim()) { setErr(t('الاسم الكامل مطلوب')); return }
    if (form.name.length < 3 || form.name.length > 50) { setErr(t('يجب أن يتراوح الاسم الكامل بين 3 و 50 حرفًا')); return }
    if (!form.phone) { setErr(t('رقم الهاتف مطلوب')); return }
    if (!/^\d{11}$/.test(form.phone)) { setErr(t('صيغة رقم الهاتف غير صحيحة')); return }
    if (!form.store?.trim()) { setErr(t('اسم المتجر مطلوب')); return }
    if (!form.nationalId) { setErr(t('رقم الهوية الوطنية مطلوب')); return }
    if (!/^\d{1,15}$/.test(form.nationalId)) { setErr(t('يجب أن يكون رقم الهوية الوطنية أقل من 15 رقمًا')); return }
    if (!form.address) { setErr(t('العنوان الوطني المختصر مطلوب')); return }
    if (!/^[A-Za-z]{4}\d{4}$/.test(form.address)) { setErr(t('يجب أن يتكون العنوان الوطني المختصر من 4 حروف تليها 4 أرقام')); return }
    if (!form.bank) { setErr(t('اسم المصرف أو البنك مطلوب')); return }
    if (!form.iban) { setErr(t('رقم الايبان مطلوب')); return }
    if (!/^[A-Z]{2}\d{22}$/.test(form.iban)) { setErr(t('يجب أن يتكون رقم الايبان من حرفين تليهما 22 رقمًا')); return }
    if (!form.gender) { setErr(t('الجنس مطلوب')); return }
    if ((form.notes ?? '').length > 500) { setErr(t('الملاحظات يجب أن تكون أقل من 500 حرف')); return }
    setErr('')
    const [first, ...rest] = (form.name ?? '').trim().split(' ')
    merchantPortalService.updateProfile(user!.id, { first, last: rest.join(' ') || first, phone: form.phone, store: form.store, nationalId: form.nationalId, address: form.address.toUpperCase(), bank: form.bank, iban: form.iban.toUpperCase(), gender: form.gender, notes: form.notes, attachments: files }).then(() => {
      toast.success(t('تم تحديث الملف الشخصي بنجاح'))
      qc.invalidateQueries({ queryKey: ['merchant-profile'] })
      setEditOpen(false)
    })
  }
  const changePwd = () => {
    if (!pwd.current) { setPErr(t('كلمة المرور الحالية مطلوبة')); return }
    if (!pwd.next) { setPErr(t('كلمة المرور الجديدة مطلوبة')); return }
    if (!PWD_RE.test(pwd.next)) { setPErr(t(PWD_MSG)); return }
    if (!pwd.confirm) { setPErr(t('تأكيد كلمة المرور مطلوب')); return }
    if (!PWD_RE.test(pwd.confirm)) { setPErr(t(PWD_MSG)); return }
    if (pwd.confirm !== pwd.next) { setPErr(t('يجب أن يتطابق تأكيد كلمة المرور مع كلمة المرور الجديدة')); return }
    setPErr('')
    merchantPortalService.changePassword(user!.email, pwd.current, pwd.next).then(() => { toast.success(t('تم تغيير كلمة المرور بنجاح')); setPwdOpen(false); setPwd({ current: '', next: '', confirm: '' }) }).catch(e => setPErr((e as Error).message))
  }
  if (isLoading || !p) return <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-sm">{t('الملف الشخصي')}</CardTitle></CardHeader><CardContent>
        <div className="mb-5 flex items-center gap-4">
          <Avatar className="size-16 rounded-2xl"><AvatarFallback className="rounded-2xl bg-foreground text-xl font-black text-background">{initials(p.name)}</AvatarFallback></Avatar>
          <div><p className="text-lg font-black">{p.name}</p><p className="text-xs font-bold text-muted-foreground">{p.store} — {t('تاجر')}</p></div>
          <div className="ms-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>{t('تعديل الملف الشخصي')}</Button>
            <Button size="sm" onClick={() => { setPwdOpen(true); setPErr('') }}>{t('تغيير كلمة المرور')}</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([[t('البريد الإلكتروني'), p.email], [t('رقم الجوال'), p.phone], [t('اسم المتجر'), p.store], [t('رقم الهوية الوطنية'), p.nationalId], [t('العنوان الوطني المختصر'), p.address], [t('اسم المصرف أو البنك'), t(p.bank)], [t('رقم الايبان'), <span key="i" dir="ltr">{p.iban}</span>], [t('الجنس'), t(p.gender)]] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
        </div>
        <div className="mt-3 rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{t('الملاحظات والبيانات الإضافية')}</p><p className="text-[13px] font-extrabold">{p.notes || '—'}</p></div>
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-bold text-muted-foreground">{t('المرفقات والوثائق')}</p>
          <AttachmentBadgeList attachments={p.attachments} emptyText={t('لا توجد مرفقات مرتبطة بهذا الحساب.')} />
        </div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">{t('بيانات الحساب')}</CardTitle></CardHeader><CardContent className="space-y-3">
        {[[t('حالة الحساب'), t('نشط')], [t('تاريخ الانضمام'), arDate('2024-03-12')], [t('آخر تسجيل دخول'), t('اليوم')]].map(([k, v]) => (
          <div key={k} className="rounded-lg border p-3"><p className="text-[13px] font-bold">{k}</p><p className="text-[11px] font-semibold text-muted-foreground">{v}</p></div>))}
      </CardContent></Card>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} wide title={t('تعديل الملف الشخصي')}
        footer={<><Button variant="outline" onClick={() => setEditOpen(false)}>{t('إلغاء')}</Button><Button onClick={save}>{t('حفظ التغييرات')}</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>{t('صورة التاجر (JPG/PNG/JPEG حتى 5MB)')}</Label><Input type="file" accept=".jpg,.png,.jpeg" onChange={e => onImage(e.target.files?.[0] ?? null)} /></div>
          <div><Label>{t('الاسم الكامل')} (3 – 50 {t('حرفًا')}) <span className="text-destructive">*</span></Label><Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>{t('رقم الهاتف (11 رقمًا)')} <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={11} value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} /></div>
          <div><Label>{t('اسم المتجر')} <span className="text-destructive">*</span></Label><Input value={form.store ?? ''} onChange={e => setForm(f => ({ ...f, store: e.target.value }))} /></div>
          <div><Label>{t('رقم الهوية الوطنية (حتى 15 رقمًا)')} <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={15} value={form.nationalId ?? ''} onChange={e => setForm(f => ({ ...f, nationalId: e.target.value.replace(/\D/g, '') }))} /></div>
          <div><Label>{t('العنوان الوطني المختصر (4 حروف + 4 أرقام)')} <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={8} value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} placeholder="RYDH1234" /></div>
          <div><Label>{t('اسم المصرف أو البنك')} <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.bank ?? ''} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}>
              <option value="">{t('اختر البنك...')}</option>
              {BANKS.map(b => <option key={b} value={b}>{t(b)}</option>)}
            </select></div>
          <div><Label>{t('رقم الايبان (حرفان + 22 رقمًا)')} <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={24} value={form.iban ?? ''} onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase().replace(/\s/g, '') }))} placeholder="SA0000000000000000000000" /></div>
          <div><Label>{t('الجنس')} <span className="text-destructive">*</span></Label>
            <div className="flex gap-5 pt-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.gender === 'ذكر'} onChange={() => setForm(f => ({ ...f, gender: 'ذكر' }))} /> {t('ذكر')}</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.gender === 'أنثى'} onChange={() => setForm(f => ({ ...f, gender: 'أنثى' }))} /> {t('أنثى')}</label>
            </div></div>
          <div className="md:col-span-2"><Label>{t('الملاحظات والبيانات الإضافية (اختياري — 500 حرف)')}</Label><Textarea maxLength={500} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div className="md:col-span-2">
            <Label className="mb-1 block">{t('المرفقات والوثائق (حتى 8 ملفات)')}</Label>
            <FileUploadWithPreview
              files={files}
              accept=".jpg,.png,.jpeg,.pdf,.webp"
              maxFiles={8}
              maxSizeMB={5}
              onChange={setFiles}
            />
          </div>
        </div>
        {err && <p className="mt-2 text-xs font-bold text-destructive">{err}</p>}
      </Modal>
      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title={t('تغيير كلمة المرور')}
        footer={<><Button variant="outline" onClick={() => setPwdOpen(false)}>{t('إلغاء')}</Button><Button onClick={changePwd}>{t('تغيير كلمة المرور')}</Button></>}>
        <div className="grid gap-3">
          <div><Label>{t('كلمة المرور الحالية')} <span className="text-destructive">*</span></Label><Input dir="ltr" type="password" value={pwd.current} onChange={e => setPwd(x => ({ ...x, current: e.target.value }))} /></div>
          <div><Label>{t('كلمة المرور الجديدة')} <span className="text-destructive">*</span></Label><Input dir="ltr" type="password" value={pwd.next} onChange={e => setPwd(x => ({ ...x, next: e.target.value }))} /></div>
          <div><Label>{t('تأكيد كلمة المرور')} <span className="text-destructive">*</span></Label><Input dir="ltr" type="password" value={pwd.confirm} onChange={e => setPwd(x => ({ ...x, confirm: e.target.value }))} /></div>
        </div>
        {pErr && <p className="mt-2 text-xs font-bold text-destructive">{pErr}</p>}
      </Modal>
    </div>
  )
}
