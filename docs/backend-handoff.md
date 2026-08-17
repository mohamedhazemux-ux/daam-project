# تسليم الباك-إند — DAAM WMS

## السياق التقني

- الواجهة: React 19 وTypeScript وVite، داخل `daam-wms-admin/`.
- نقطة API الافتراضية: `/api`، ويمكن تغييرها عبر `VITE_API_BASE_URL`.
- المصادقة: الواجهة ترسل Cookies (`credentials: include`) وتدعم أيضاً `Authorization: Bearer <token>` إذا وُجد `daam-access-token` في `localStorage`.
- جميع قوائم الواجهة تتوقع `{ "rows": [...], "total": 123 }` مع `page` و`pageSize` و`q` كمعاملات استعلام.
- تواريخ API تكون ISO 8601، والمبالغ أرقاماً بالريال، والملفات تعاد كرابط موقّع أو معرّف مرفق.

## المصادقة والصلاحيات

| العملية | المسار المقترح | المخرج |
|---|---|---|
| دخول مدير أو تاجر | `POST /api/auth/login` | `{accessToken?, user}` |
| تحديث الجلسة | `POST /api/auth/refresh` | `{accessToken?, user}` |
| خروج | `POST /api/auth/logout` | `204` |
| طلب/تأكيد OTP | `POST /api/auth/password/otp`, `POST /api/auth/password/reset` | `204` |

يمتلك المدير صلاحيات الوحدات، ويُقيد التاجر ببيانات متجره من الخادم، لا من قيمة مرسلة من العميل.

## الموارد الرئيسية

| المورد | مسارات REST الأساسية | عمليات الحالة |
|---|---|---|
| التجار | `/merchants`, `/merchants/:id` | `PATCH /merchants/:id/status` |
| المنتجات والمخزون | `/products`, `/inventory/levels`, `/inventory/requests` | `POST /inventory/requests/:id/approve`, `POST /inventory/requests/:id/reject`, `POST /inventory/adjustments`, `POST /inventory/transfers`, `POST /inventory/counts` |
| الطلبات | `/orders`, `/orders/:id` | `PATCH /orders/:id/status`, `POST /orders/:id/picking-assignment`, `GET /orders/:id/packing-slip`, `GET /orders/:id/shipping-label` |
| مرتجعات | `/returns`, `/returns/:ref` | `POST /returns/:ref/approve`, `/reject`, `/receive`, `/inspect`, `/refund` |
| مالية | `/finance/withdrawals`, `/finance/wallets`, `/finance/invoices` | `POST /finance/withdrawals/:id/approve`, `/reject`, `/process`, `/complete`; `POST /finance/wallets/:id/adjust`; `POST /finance/invoices/:ref/resend` |
| التاجر | `/merchant/dashboard`, `/merchant/orders`, `/merchant/products`, `/merchant/services`, `/merchant/reports`, `/merchant/profile` | تحكم الخادم في متجر المستخدم الحالي |
| النظام | `/approvals`, `/notifications`, `/audit-logs`, `/settings` | اعتماد أو رفض لا يتم إلا بمعاملة ذرّية |

## قواعد أعمال لا ينبغي تجاوزها

- اعتماد طلب مخزون يحدّث المخزون في نفس المعاملة؛ السحب لا يجعل الكمية سالبة.
- دورة السحب: `معلق → معتمد → قيد التنفيذ → مكتمل`، والرفض يحرر الرصيد المحجوز.
- دورة المرتجع: `معلق → معتمد → في الطريق → مستلم → تم الفحص → تم الاسترداد`.
- لا يُلغى طلب التاجر إلا وهو `معلق`.
- يسجل الخادم كل العمليات الحساسة في سجل تدقيق غير قابل للتعديل (الفاعل، الإجراء، المورد، الوقت، IP/معرّف الطلب).

## أخطاء موحّدة

استخدم شكل الخطأ التالي في كل الاستجابات غير الناجحة:

```json
{ "message": "وصف واضح للمستخدم", "code": "WITHDRAWAL_INVALID_STATE", "details": {} }
```

الحالات المتوقعة: `400` إدخال غير صالح، `401` غير مصادق، `403` لا صلاحية، `404` غير موجود، `409` تعارض أو انتقال حالة غير صالح، `422` قاعدة عمل غير محققة، و`429` تجاوز حد الطلبات.

## خطة الاستبدال

الخدمات تحت `daam-wms-admin/src/services/` تعتمد حالياً على `src/mocks/db.ts`. استبدل كل دالة بخدمة API مماثلة باستخدام `apiRequest` مع الحفاظ على أسماء الدوال وأنواع النتائج؛ هكذا تبقى مكونات الواجهة دون تغيير كبير. ابدأ بالمصادقة والتاجر والطلبات، ثم المخزون والمالية، وأزل استيرادات `@/mocks` بعد اكتمال كل وحدة.
