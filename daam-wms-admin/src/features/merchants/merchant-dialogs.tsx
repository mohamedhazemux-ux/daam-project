import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Modal, StatusBadge, selectCls } from '@/components/common'
import { merchantSchema, type MerchantForm } from '@/schemas/merchant.schema'
import { merchantService, storageStatus } from '@/services/merchant.service'
import { arDate, generatePassword, initials } from '@/lib/utils'
import type { Merchant } from '@/types'
import { RefreshCw } from 'lucide-react'

const BANKS = ['مصرف الراجحي', 'البنك الأهلي السعودي', 'بنك الرياض', 'بنك الإنماء', 'بنك البلاد', 'بنك ساب', 'البنك الأول']
const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export function MerchantFormDialog({ open, onOpenChange, merchant, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  merchant: Merchant | null
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, setValue, watch, reset, setError, formState: { errors } } = useForm<MerchantForm>({ resolver: zodResolver(merchantSchema), defaultValues: { unit: 'م³', limit: 60 } })

  useEffect(() => {
    if (!open) return
    reset(merchant ? {
      store: merchant.store, first: merchant.first, last: merchant.last, natId: merchant.natId, natAddr: merchant.natAddr,
      bank: merchant.bank, iban: merchant.iban, email: merchant.email, phone: merchant.phone, gender: merchant.gender,
      limit: merchant.limit, unit: merchant.unit, notes: merchant.notes ?? '',
    } : { unit: 'م³', limit: 60 })
  }, [open, merchant, reset])

  const first = watch('first') ?? ''
  const last = watch('last') ?? ''

  const onSubmit = handleSubmit(async v => {
    if (!merchant) {
      if (!v.password) { setError('password', { message: 'كلمة المرور مطلوبة' }); return }
      if (!PWD_RE.test(v.password)) { setError('password', { message: 'يجب ألا تقل كلمة المرور عن 8 أحرف وأن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة' }); return }
    }
    setBusy(true)
    try {
      if (await merchantService.emailExists(v.email, merchant?.id)) {
        setError('email', { message: 'هذا البريد الإلكتروني مرتبط بتاجر آخر' })
        setBusy(false)
        return
      }
      if (merchant) {
        const patch = { ...v }
        delete (patch as { email?: string }).email
        delete (patch as { natId?: string }).natId
        delete (patch as { password?: string }).password
        await merchantService.update(merchant.id, patch)
        toast.success('تم تحديث بيانات التاجر بنجاح')
      } else {
        const merchantInput = { ...v }
        delete (merchantInput as { password?: string }).password
        await merchantService.create(merchantInput)
        toast.success('تم إنشاء التاجر بنجاح — تم إرسال بيانات الدخول إلى بريد التاجر')
      }
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  })

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      wide
      title={merchant ? 'تعديل بيانات التاجر — ' + merchant.store : 'إنشاء تاجر جديد'}
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        <Button type="submit" form="merchant-form" disabled={busy}>{busy ? 'جارٍ الحفظ...' : merchant ? 'حفظ التغييرات' : 'إنشاء'}</Button>
      </>}
    >
      <form id="merchant-form" className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit} noValidate>
        <div className="md:col-span-2 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <Avatar className="size-12 rounded-xl"><AvatarFallback className="rounded-xl bg-foreground text-lg font-black text-background">{initials((first || '؟') + ' ' + (last || ''))}</AvatarFallback></Avatar>
          <p className="text-xs font-bold text-muted-foreground">معاينة الأفاتار التلقائي (أول حرف من الاسم الأول + أول حرف من الاسم الأخير)</p>
        </div>
        <div className="md:col-span-2"><Label>اسم المتجر <span className="text-destructive">*</span></Label><Input {...register('store')} />{errors.store && <p className="mt-1 text-xs font-bold text-destructive">{errors.store.message}</p>}</div>
        <div><Label>الاسم الأول <span className="text-destructive">*</span></Label><Input {...register('first')} />{errors.first && <p className="mt-1 text-xs font-bold text-destructive">{errors.first.message}</p>}</div>
        <div><Label>الاسم الأخير <span className="text-destructive">*</span></Label><Input {...register('last')} />{errors.last && <p className="mt-1 text-xs font-bold text-destructive">{errors.last.message}</p>}</div>
        <div><Label>رقم الهوية الوطنية <span className="text-destructive">*</span></Label><Input inputMode="numeric" maxLength={15} {...register('natId')} disabled={!!merchant} />{errors.natId && <p className="mt-1 text-xs font-bold text-destructive">{errors.natId.message}</p>}</div>
        <div><Label>العنوان الوطني المختصر (4 أحرف + 4 أرقام) <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={8} placeholder="RKBD1024" {...register('natAddr')} />{errors.natAddr && <p className="mt-1 text-xs font-bold text-destructive">{errors.natAddr.message}</p>}</div>
        <div><Label>اسم البنك <span className="text-destructive">*</span></Label>
          <select className={selectCls + ' w-full'} {...register('bank')}>
            <option value="">اختر البنك...</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {errors.bank && <p className="mt-1 text-xs font-bold text-destructive">{errors.bank.message}</p>}</div>
        <div><Label>رقم الآيبان (حرفان + 22 رقمًا) <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={24} placeholder="SA0000000000000000000000" {...register('iban')} />{errors.iban && <p className="mt-1 text-xs font-bold text-destructive">{errors.iban.message}</p>}</div>
        <div><Label>البريد الإلكتروني <span className="text-destructive">*</span></Label><Input dir="ltr" {...register('email')} disabled={!!merchant} />{errors.email && <p className="mt-1 text-xs font-bold text-destructive">{errors.email.message}</p>}</div>
        <div><Label>رقم الجوال <span className="text-destructive">*</span></Label><Input dir="ltr" maxLength={11} placeholder="05XXXXXXXX" {...register('phone')} />{errors.phone && <p className="mt-1 text-xs font-bold text-destructive">{errors.phone.message}</p>}</div>
        <div><Label>الجنس <span className="text-destructive">*</span></Label>
          <div className="flex gap-5 pt-2">
            <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" value="ذكر" {...register('gender')} /> ذكر</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="radio" value="أنثى" {...register('gender')} /> أنثى</label>
          </div>
          {errors.gender && <p className="mt-1 text-xs font-bold text-destructive">{errors.gender.message}</p>}</div>
        <div><Label>حد التخزين المجاني (CR-003) <span className="text-destructive">*</span></Label><Input type="number" min={0} {...register('limit', { valueAsNumber: true })} />{errors.limit && <p className="mt-1 text-xs font-bold text-destructive">{errors.limit.message}</p>}</div>
        <div><Label>وحدة حد التخزين <span className="text-destructive">*</span></Label>
          <select className={selectCls + ' w-full'} {...register('unit')}>
            <option value="م³">م³</option>
            <option value="مواقع طبلية">مواقع طبلية</option>
            <option value="وحدات">وحدات</option>
          </select></div>
        <div className="md:col-span-2"><Label>ملاحظات (اختياري — 500 حرف كحد أقصى)</Label><Textarea maxLength={500} {...register('notes')} />{errors.notes && <p className="mt-1 text-xs font-bold text-destructive">{errors.notes.message}</p>}</div>
        <div className="md:col-span-2"><Label>المرفقات (اختياري — JPG/PNG/JPEG/PDF حتى 5MB وبحد أقصى 8 ملفات)</Label><Input type="file" multiple accept=".jpg,.png,.jpeg,.pdf" />
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">يرجى توفير المستندات الرسمية للمتجر (مثل السجل التجاري + شهادة التسجيل الضريبي أو وثيقة العمل الحر) لإجراء مراجعة التاجر</p></div>
        {!merchant && (
          <div className="md:col-span-2"><Label>كلمة مرور التاجر <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Input dir="ltr" {...register('password')} />
              <Button type="button" variant="outline" onClick={() => setValue('password', generatePassword(), { shouldValidate: true })} aria-label="توليد كلمة مرور"><RefreshCw className="size-4" /></Button>
            </div>
            {errors.password && <p className="mt-1 text-xs font-bold text-destructive">{errors.password.message}</p>}</div>
        )}
      </form>
    </Modal>
  )
}

export function MerchantDetailDialog({ merchant, onClose }: { merchant: Merchant | null; onClose: () => void }) {
  if (!merchant) return null
  const pct = merchant.limit ? Math.round((merchant.used / merchant.limit) * 100) : 0
  const st = storageStatus(merchant.used, merchant.limit)
  const kv: [string, React.ReactNode][] = [
    ['اسم المتجر', merchant.store], ['الاسم الكامل', merchant.first + ' ' + merchant.last], ['البريد الإلكتروني', merchant.email],
    ['الجوال', <span dir="ltr" key="p">{merchant.phone}</span>], ['رقم الهوية الوطنية', merchant.natId], ['العنوان الوطني المختصر', merchant.natAddr],
    ['البنك', merchant.bank], ['رقم الآيبان', <span dir="ltr" key="i">{merchant.iban}</span>], ['الجنس', merchant.gender],
    ['الحالة', <StatusBadge key="s" value={merchant.status} />], ['حالة الانضمام', <StatusBadge key="j" value={merchant.join} />], ['تاريخ الإنشاء', arDate(merchant.created)],
  ]
  return (
    <Modal open onClose={onClose} wide title={'تفاصيل التاجر — ' + merchant.store} footer={<Button variant="outline" onClick={onClose}>إغلاق</Button>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kv.map(([k, v]) => <div key={k as string} className="rounded-lg border bg-muted/40 px-3 py-2"><p className="text-[11px] font-bold text-muted-foreground">{k}</p><p className="text-[13px] font-extrabold">{v}</p></div>)}
      </div>
      {merchant.notes && (
        <>
          <h4 className="mt-4 text-sm font-extrabold">الملاحظات</h4>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm font-semibold">{merchant.notes}</div>
        </>
      )}
      {merchant.attachments && merchant.attachments.length > 0 && (
        <>
          <h4 className="mt-4 text-sm font-extrabold">المرفقات</h4>
          <div className="flex flex-wrap gap-2">
            {merchant.attachments.filter(Boolean).map(item => (
              <span key={item} className="rounded-md border bg-card px-2 py-1 text-[11px] font-bold">
                📎 {item}
              </span>
            ))}
          </div>
        </>
      )}
      <h4 className="mt-4 text-sm font-extrabold">حد التخزين المجاني (CR-003)</h4>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted"><div className={'h-full ' + (st === 'متجاوز' ? 'bg-destructive' : st === 'تحذير' ? 'bg-warning' : 'bg-foreground')} style={{ width: Math.min(100, pct) + '%' }} /></div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold text-muted-foreground">
        <span>الحد: {merchant.limit} {merchant.unit}</span>
        <span>المستخدم: {merchant.used} {merchant.unit} ({pct}%)</span>
        <span>المتبقي: {Math.max(0, merchant.limit - merchant.used)} {merchant.unit}</span>
        <StatusBadge value={st} />
      </div>
      <h4 className="mt-4 text-sm font-extrabold">سجل النشاط</h4>
      <ul className="space-y-2 border-s-2 ps-4 text-sm">
        <li><p className="font-bold">إنشاء الحساب بواسطة مدير النظام</p><p className="text-xs text-muted-foreground">{arDate(merchant.created)}</p></li>
        <li><p className="font-bold">إرسال بيانات الدخول إلى بريد التاجر</p><p className="text-xs text-muted-foreground">{arDate(merchant.created)}</p></li>
        {merchant.join === 'منضم' && <li><p className="font-bold">أول تسجيل دخول للتاجر</p><p className="text-xs text-muted-foreground">بعد الإنشاء بيوم واحد</p></li>}
      </ul>
    </Modal>
  )
}
