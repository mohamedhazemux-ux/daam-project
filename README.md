# DAAM WMS Admin

واجهة إدارة منصة DAAM لإدارة التجار والمخزون والطلبات والمالية. الواجهة مبنية بـ React + TypeScript + Vite وتحتوي بيانات تجريبية حالياً؛ وثيقة التكامل الخلفي موجودة في [docs/backend-handoff.md](docs/backend-handoff.md).

## التشغيل

```bash
npm install
npm run dev
```

يفضّل استخدام Node.js 20 أو أحدث. أوامر الجودة والإنتاج:

```bash
npm run lint
npm run build
```

## ربط الـ API

انسخ `daam-wms-admin/.env.example` إلى `daam-wms-admin/.env` واضبط متغيرات البيئة. عند التشغيل المحلي، اجعل `VITE_API_BASE_URL=/api` وأضف `VITE_API_PROXY_TARGET` لعنوان خادم الباك‑إند، فيتجنب ذلك مشكلات CORS. عميل HTTP المركزي في `daam-wms-admin/src/services/http.ts` يدعم Cookies أو `Bearer` token محفوظاً تحت `daam-access-token`.

> بيانات `src/mocks` مخصصة للعرض فقط، ويجب استبدال استدعاءات الخدمات الموجودة في `src/services` بطلبات API تدريجياً وفق عقد التكامل.
