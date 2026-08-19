// src/lib/env.ts
// ─────────────────────────────────────────────────────────────────────────────
// ضبط بيئة التشغيل — يُستخدم في جميع أنحاء التطبيق.
//
// للتبديل من Demo إلى Backend حقيقي:
//   1. في .env.local:  VITE_USE_MOCK=false
//   2. في كل service:  استبدل import { db } بـ apiRequest<T>(...)
// ─────────────────────────────────────────────────────────────────────────────

/** هل التطبيق يعمل بالبيانات التجريبية؟ (true في dev إذا لم تُضبط VITE_USE_MOCK) */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** URL الـ API الأساسي */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

/** هل البيئة تطويرية؟ */
export const IS_DEV = import.meta.env.DEV
