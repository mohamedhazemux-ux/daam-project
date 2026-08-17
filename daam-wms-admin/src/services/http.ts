import type { ListQuery, ListResult } from '@/types'
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = 'ApiError' }
}
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('daam-access-token')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init, credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(response.status, body?.message ?? 'Request failed')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
export const delay = (ms = 300) => new Promise<void>(r => setTimeout(r, ms))
export function paginate<T>(rows: T[], q: ListQuery): ListResult<T> {
  const page = q.page ?? 1
  const pageSize = q.pageSize ?? 10
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length }
}
