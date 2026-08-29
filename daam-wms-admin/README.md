# Daam WMS & Merchant Portal | نظام إدارة المستودعات وبوابة التجار الداعمة

منظومة متكاملة لإدارة المستودعات الذكية والخدمات اللوجستية وبوابة التجار (B2B Warehouse Management System & Merchant Portal). مبنية بأحدث معايير الويب التفاعلية لتقديم تجربة مستخدم سريعة، سلسة، ومطابقة للأنظمة والمعايير السعودية (بما فيها رمز الريال السعودي `﷼` المعتمد ودعم كامل للغتين العربية والإنجليزية RTL/LTR).

---

## 🚀 المميزات الرئيسية (Key Features)

1. **بوابة الإدارة المركزية (Admin Portal)**:
   - لوحة تحكم ذكية ومؤشرات أداء متقدمة (KPIs) وإحصائيات تفاعلية.
   - إدارة التجار ومراجعة الحسابات وتعيين حدود التخزين والوثائق.
   - إدارة المخزون، المستودعات، المواقع التخزينية، وحركات الجرد.
   - دورة حياة متكاملة لمعالجة الطلبات، التغليف، وتعيين المنتقين.
   - إدارة الشحنات وبوالص الشحن (Shipping Labels) وقوائم التجميع (Packing Slips) بصيغة PDF.
   - معالجة طلبات الإرجاع، الفحص المخبري، والاسترداد المالي.
   - المحفظة المالية، الفواتير الدورية، وفوترة الخدمات اللوجستية.
   - محرك الموافقات متعدد المستويات (Approvals System).
   - مركز الإشعارات الفوري وسجلات التدقيق والأمان الشاملة (Audit Logs).

2. **بوابة التاجر (Merchant Portal)**:
   - لوحة تحكم مخصصة لكل متجر لمتابعة الطلبات، المخزون، والمبيعات.
   - إدارة الكتالوج والمنتجات والربط مع منتجات المنصة العامة.
   - إنشاء ومتابعة الطلبات وتحديد مسؤولية الشحن (شحن المنصة / الشحن الذاتي).
   - رفع بوالص الشحن وتتبع أرقام الشحنات.
   - طلبات الخدمات الإضافية والتخزين المبرد والمخصص.
   - المحفظة الرقمية، طلبات السحب البنكي، والاطلاع على الفواتير.
   - تقارير تفصيلية مع إمكانية التصدير (Excel/CSV).

3. **تجربة استخدام متقدمة (UX & Localization)**:
   - دعم كامل وفوري للغتين **العربية (RTL)** و **الإنجليزية (LTR)** عبر 1,818+ مفتاح ترجمة.
   - الوضع الليلي والنهاري (Dark / Light Theme).
   - الاعتماد الكامل على رمز العملة السعودي الرسمي `﷼` / `SAR`.
   - تواريخ ديناميكية بالشهور المترجمة عبر `arDate()`.

---

## 🛠 التقنيات المستخدمة (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Class Variance Authority, Tailwind Merge
- **Icons**: Lucide React
- **State & Data Fetching**: TanStack Query (React Query), Zustand
- **Tables & Forms**: TanStack Table, Custom UI Component primitives
- **Notifications & Documents**: Sonner Toasts, jsPDF, Print/Export utilities

---

## 🔌 دليل ربط الواجهة الخلفية (Backend API Integration Guide)

المنظومة مهيأة بالكامل للربط المباشر مع خوادم الـ Backend (Node.js, Laravel, Python, Go, Java, .NET) عبر طبقة HTTP موحدة ومعزولة (`src/services/`).

### 1. إعداد المتغيرات البيئية (Environment Variables)

قم بإنشاء ملف `.env` في المجلد الرئيسي للمشروع:

```env
VITE_API_BASE_URL=https://api.yourdomain.com/v1
VITE_APP_ENV=production
```

### 2. معمارية الـ HTTP Client (`src/services/http.ts`)

- جميع الطلبات تمر تلقائياً عبر `apiRequest<T>(endpoint, options)`.
- يتم إرفاق رمز التوثيق تلقائياً في الترويسة:
  ```http
  Authorization: Bearer <daam-access-token>
  Accept: application/json
  Content-Type: application/json
  ```
- معالجة تلقائية لأخطاء `401 Unauthorized` وتوجيه المستخدم لتسجيل الدخول.
- معالجة أخطاء الـ API وإرجاع `ApiError` بكود الحالة والرسالة المترجمة.

### 3. خريطة مسارات الـ API (Endpoints Map)

| الوحدة (Module) | المسار (API Endpoint) | الوصف |
| :--- | :--- | :--- |
| **المصادقة (Auth)** | `POST /auth/login` | تسجيل الدخول واستلام التوكن |
| | `POST /auth/merchant-login` | تسجيل دخول التاجر |
| | `POST /auth/logout` | إنهاء الجلسة |
| **الطلبات (Orders)** | `GET /orders` | جلب قائمة الطلبات مع التصفية والترقيم |
| | `GET /orders/:id` | تفاصيل الطلب وسجل التتبع |
| | `POST /orders/:id/accept` | قبول الطلب |
| | `POST /orders/:id/pack` | نقل الطلب للتغليف |
| | `POST /orders/:id/assign-picker` | إسناد الطلب للمنتقي |
| **المخزون (Inventory)**| `GET /inventory` | جلب المخزون وحركات الجرد |
| | `POST /inventory/adjust` | تسوية المخزون |
| **المرتجعات (Returns)** | `GET /returns` | طلبات الإرجاع والفحص |
| | `POST /returns/:id/inspect` | تسجيل نتيجة الفحص |
| **المالية (Finance)** | `GET /finance/overview` | مؤشرات المحفظة والعمليات |
| | `POST /finance/withdraw` | طلب سحب مالي |
| **الخدمات (Services)** | `GET /services/requests` | طلبات الخدمات اللوجستية |
| | `POST /services/requests` | تقديم طلب خدمة جديدة |
| **سجلات التدقيق (Logs)**| `GET /audit-logs` | استعراض سجلات التدقيق والأمان |

---

## 💻 التشغيل والتطوير (Getting Started)

### تثبيت الاعتماديات:
```bash
npm install
```

### تشغيل خادم التطوير:
```bash
npm run dev
```

### بناء حزمة الإنتاج:
```bash
npm run build
```

---

## 📂 هيكل المشروع (Project Structure)

```
daam-wms-admin/
├── src/
│   ├── app/           # توجيه الصفحات وإعدادات المسارات (Routing)
│   ├── components/    # المكونات المشتركة، القوائم، وتنسيقات الجداول والشارات
│   ├── features/      # وحدات النظام (طلبات، مخزون، تجار، مالية، خدمات، إعدادات)
│   ├── lib/           # أدوات مساعدة، إدارة اللغات والترجمة، ومولدات PDF
│   ├── locales/       # قواميس اللغات الكاملة (ar.json, en.json)
│   ├── mocks/         # قاعدة البيانات التجريبية وبيئة المحاكاة
│   ├── services/      # طبقة الاتصال بالـ API والخدمات
│   ├── store/         # إدارة الحالة العامة (Zustand Stores)
│   └── types/         # تعريفات TypeScript ونماذج البيانات
├── scripts/           # سكربتات التدقيق ومزامنة القواميس
└── package.json
```
