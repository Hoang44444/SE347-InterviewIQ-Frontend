import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ROUTES } from './paths'

import { Spinner } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

/**
 * Chặn các route cần đăng nhập.
 * Nhớ lại trang đang định vào (state.from) để login xong quay lại đúng chỗ.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  return <Outlet />
}
