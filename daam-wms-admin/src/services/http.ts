// src/services/http.ts
// ─────────────────────────────────────────────────────────────────────────────
// HTTP client موحّد — جاهز للبيئة الحقيقية.
//
// للربط مع الـ backend:
//   1. أنشئ ملف .env وضع فيه:  VITE_API_BASE_URL=https://api.yourserver.com
//   2. احذف سطر import '@/mocks/persist' من router.tsx
//   3. في كل service، استبدل استدعاءات db.* بـ apiRequest<T>(...)
// ─────────────────────────────────────────────────────────────────────────────

import type { ListQuery, ListResult } from '@/types'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

/** خطأ HTTP مع كود الحالة — يُمكن التمييز بينه وبين أخطاء الشبكة */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * دالة HTTP موحّدة — تُضيف Authorization header تلقائياً
 * وتُعالج أخطاء API بشكل موحّد.
 *
 * @throws {ApiError}  عند استجابة HTTP غير ناجحة (status >= 400)
 * @throws {TypeError} عند فشل الاتصال بالشبكة
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('daam-access-token')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  // 401 → جلسة منتهية — سجّل خروج تلقائي
  if (response.status === 401) {
    // استيراد ديناميكي لتجنب circular dependency
    const { useAuthStore } = await import('@/store/auth-store')
    useAuthStore.getState().logout()
    throw new ApiError(401, 'انتهت جلسة العمل، يرجى تسجيل الدخول من جديد')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(response.status, body?.message ?? 'حدث خطأ في الخادم')
  }

  // 204 No Content
  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

// ── Mock helpers (تُستخدم فقط في بيئة Demo — حذفها عند الربط مع Backend) ──
export const delay = (ms = 300) => new Promise<void>(r => setTimeout(r, ms))

export function paginate<T>(rows: T[], q: ListQuery): ListResult<T> {
  const page = q.page ?? 1
  const pageSize = q.pageSize ?? 10
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length }
}
