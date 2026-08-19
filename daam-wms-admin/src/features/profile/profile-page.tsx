import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploadWithPreview, Modal, selectCls } from '@/components/common'
import { useAuthStore } from '@/store/auth-store'
import { adminService } from '@/services/admin.service'
import { initials } from '@/lib/utils'
const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const [editOpen, setEditOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [avatar, setAvatar] = useState<string[]>([])
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', dept: user?.dept ?? 'تقنية المعلومات', gender: user?.gender ?? 'ذكر' })
  const [eErr, setEErr] = useState('')
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pErr, setPErr] = useState('')
  const saveProfile = () => {
    if (!form.name.trim()) { setEErr('الاسم الكامل مطلوب'); return }
    if (form.name.length < 3 || form.name.length > 50) { setEErr('يجب أن يكون الاسم الكامل بين 3 و 50 حرفًا'); return }
    if (!form.phone) { setEErr('رقم الجوال مطلوب'); return }
    if (!/^\d{11}$/.test(form.phone)) { setEErr('صيغة رقم الجوال غير صحيحة'); return }
    if (!form.dept) { setEErr('القسم مطلوب'); return }
    setEErr('')
    if (user) setUser({ ...user, ...form })
    adminService.updateProfile({ ...form, gender: form.gender as 'ذكر' | 'أنثى' }).then(() => { toast.success('تم تحديث الملف الشخصي بنجاح'); setEditOpen(false) })
  }
  const changePwd = () => {
    if (!pwd.current) { setPErr('كلمة المرور الحالية مطلوبة'); return }
    if (!pwd.next) { setPErr('كلمة المرور الجديدة مطلوبة'); return }
    if (!PWD_RE.test(pwd.next)) { setPErr('يجب ألا تقل كلمة المرور عن 8 أحرف وأن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة'); return }
    if (!pwd.confirm) { setPErr('تأكيد كلمة المرور مطلوب'); return }
    if (pwd.confirm !== pwd.next) { setPErr('يجب أن يتطابق تأكيد كلمة المرور مع كلمة المرور الجديدة'); return }
    setPErr('')
    adminService.changePassword(pwd.current, pwd.next)
      .then(() => { toast.success('تم تغيير كلمة المرور بنجاح'); setPwdOpen(false); setPwd({ current: '', next: '', confirm: '' }) })
      .catch(e => setPErr((e as Error).message))
  }
  const onImage = (f: File | null) => {
    if (!f) return
    if (!/\.(jpg|png|jpeg)$/i.test(f.name)) { toast.error('امتداد الصورة غير صالح، يرجى رفع صورة JPG أو PNG أو JPEG'); return }
    if (f.size > 5 * 1024 * 1024) { toast.error('الحد الأقصى لحجم الصورة هو 5MB، يرجى استخدام صورة أصغر'); return }
    toast.success('تم رفع الصورة بنجاح')
  }
  if (!user) return null
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-sm">الملف الشخصي</CardTitle></CardHeader><CardContent>
        <div className="mb-5 flex items-center gap-4">
          <Avatar className="size-16 rounded-2xl"><AvatarFallback className="rounded-2xl bg-foreground text-xl font-black text-background">{initials(user.name)}</AvatarFallback></Avatar>
          <div><p className="text-lg font-black">{user.name}</p><p className="text-xs font-bold text-muted-foreground">{user.role} — {user.dept}</p></div>
          <Button variant="outline" size="sm" className="ms-auto" onClick={() => setEditOpen(true)}>تعديل الملف</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[['البريد الإلكتروني', user.email], ['رقم الجوال', user.phone], ['القسم', user.dept], ['الدور', user.role], ['الجنس', user.gender]].map(([k, v]) => (
            <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>))}
        </div>
        <Button className="mt-4" onClick={() => setPwdOpen(true)}>تغيير كلمة المرور</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">آخر الأنشطة</CardTitle></CardHeader><CardContent className="space-y-3">
        {[['تسجيل دخول ناجح إلى لوحة التحكم', 'اليوم 08:02'], ['اعتماد طلب المخزون SR-0998', 'أمس 14:22'], ['تعديل معاملات النظام — الإشعارات', 'أمس 16:03']].map(([d, t]) => (
          <div key={d} className="rounded-lg border p-3"><p className="text-[13px] font-bold">{d}</p><p className="text-[11px] font-semibold text-muted-foreground">{t}</p></div>))}
      </CardContent></Card>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="تعديل الملف الشخصي"
        footer={<><Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button><Button onClick={saveProfile}>حفظ التغييرات</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FileUploadWithPreview
              label="الصورة الشخصية (JPG/PNG/JPEG حتى 5MB)"
              files={avatar}
              accept=".jpg,.png,.jpeg,.webp"
              single
              maxSizeMB={5}
              onChange={setAvatar}
            />
          </div>
          <div><Label>الاسم الكامل (3 – 50 حرفًا) <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>رقم الجوال (11 رقمًا) <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={11} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>القسم <span className="text-destructive">*</span></Label>
            <select className={selectCls + ' w-full'} value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}>
              {['تقنية المعلومات', 'العمليات', 'المالية', 'خدمة العملاء'].map(d => <option key={d} value={d}>{d}</option>)}
            </select></div>
          <div><Label>الجنس <span className="text-destructive">*</span></Label>
            <div className="flex gap-5 pt-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.gender === 'ذكر'} onChange={() => setForm(f => ({ ...f, gender: 'ذكر' }))} /> ذكر</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" checked={form.gender === 'أنثى'} onChange={() => setForm(f => ({ ...f, gender: 'أنثى' }))} /> أنثى</label>
            </div></div>
        </div>
        {eErr && <p className="mt-2 text-xs font-bold text-destructive">{eErr}</p>}
      </Modal>
      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title="تغيير كلمة المرور"
        footer={<><Button variant="outline" onClick={() => setPwdOpen(false)}>إلغاء</Button><Button onClick={changePwd}>تغيير كلمة المرور</Button></>}>
        <div className="grid gap-3">
          <div><Label>كلمة المرور الحالية <span className="text-destructive">*</span></Label><Input type="password" dir="ltr" value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} /></div>
          <div><Label>كلمة المرور الجديدة <span className="text-destructive">*</span></Label><Input type="password" dir="ltr" value={pwd.next} onChange={e => setPwd(p => ({ ...p, next: e.target.value }))} /></div>
          <div><Label>تأكيد كلمة المرور <span className="text-destructive">*</span></Label><Input type="password" dir="ltr" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} /></div>
        </div>
        {pErr && <p className="mt-2 text-xs font-bold text-destructive">{pErr}</p>}
      </Modal>
    </div>
  )
}
