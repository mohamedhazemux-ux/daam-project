import { z } from 'zod'

const len = (min: number, max: number, req: string, between: string) =>
  z.string().min(1, req).refine(v => v.length >= min && v.length <= max, between)

export const merchantSchema = z.object({
  store: len(3, 50, 'اسم المتجر مطلوب', 'يجب أن يكون اسم المتجر بين 3 و 50 حرفًا'),
  first: len(3, 50, 'الاسم الأول مطلوب', 'يجب أن يكون الاسم الأول بين 3 و 50 حرفًا'),
  last: len(3, 50, 'الاسم الأخير مطلوب', 'يجب أن يكون الاسم الأخير بين 3 و 50 حرفًا'),
  natId: z.string().min(1, 'رقم الهوية الوطنية مطلوب').regex(/^\d{1,15}$/, 'يجب أن يقل رقم الهوية الوطنية عن 15 رقمًا'),
  natAddr: z.string().min(1, 'العنوان الوطني المختصر مطلوب').regex(/^[A-Za-z]{4}\d{4}$/, 'يجب أن يتكون العنوان الوطني المختصر من 4 أحرف تليها 4 أرقام'),
  bank: z.string().min(1, 'اسم البنك مطلوب'),
  iban: z.string().min(1, 'رقم الآيبان مطلوب').regex(/^[A-Za-z]{2}\d{22}$/, 'يجب أن يبدأ رقم الآيبان بحرفين يليهما 22 رقمًا صحيحًا').transform(v => v.toUpperCase()),
  email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('يجب أن يكون البريد الإلكتروني بصيغة صحيحة (مثال: example@example.com)'),
  phone: z.string().min(1, 'رقم الجوال مطلوب').regex(/^05\d{8}$/, 'رقم الجوال لا يتطابق مع صيغة رمز الدولة'),
  gender: z.enum(['ذكر', 'أنثى'], { error: 'الجنس مطلوب' }),
  limit: z.number({ error: 'حد التخزين المجاني مطلوب' }).min(0, 'يجب أن يكون حد التخزين المجاني 0 على الأقل').max(1000000, 'يجب أن يكون حد التخزين المجاني أقل من 1,000,000'),
  unit: z.string().min(1, 'وحدة حد التخزين مطلوبة'),
  notes: z.string().max(500, 'الملاحظات يجب أن تكون أقل من 500 حرف').optional(),
  password: z.string().optional(),
})
export type MerchantForm = z.infer<typeof merchantSchema>

export const rejectionSchema = z.object({
  reason: z.string().min(1, 'سبب الرفض مطلوب').min(10, 'يجب أن يكون سبب الرفض بين 10 و 500 حرف').max(500, 'يجب أن يكون سبب الرفض بين 10 و 500 حرف'),
})
export type RejectionInput = z.infer<typeof rejectionSchema>
