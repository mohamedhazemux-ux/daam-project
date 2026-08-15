import { z } from 'zod'

export const strongPassword = (msg = 'يجب ألا تقل كلمة المرور عن 8 أحرف وأن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة') =>
  z.string().min(8, msg).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, msg)

export const emailField = z.string()
  .min(1, 'البريد الإلكتروني مطلوب')
  .email('يجب أن يكون البريد الإلكتروني بصيغة صحيحة (مثال: example@example.com)')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const forgotEmailSchema = z.object({ email: emailField })

export const otpSchema = z.object({ code: z.string().length(6, 'رمز التحقق غير صحيح') })

export const resetPasswordSchema = z.object({
  password: strongPassword('كلمة المرور مطلوبة'),
  confirm: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
}).refine(d => d.password === d.confirm, {
  path: ['confirm'],
  message: 'يجب أن يتطابق تأكيد كلمة المرور مع كلمة المرور الجديدة',
})