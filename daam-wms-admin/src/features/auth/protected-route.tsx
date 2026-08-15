import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import type { ReactNode } from 'react'
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.portal === 'merchant') return <Navigate to="/merchant" replace />
  return <>{children}</>
}
export function MerchantProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user || user.portal !== 'merchant') return <Navigate to="/merchant/login" replace />
  return <>{children}</>
}
