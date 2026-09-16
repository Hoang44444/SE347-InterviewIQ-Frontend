import { Link, Outlet } from 'react-router-dom'

import { Card } from '@/components/ui'
import { APP_NAME } from '@/constants'
import { ROUTES } from '@/routes/paths'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken px-4 py-12">
      <div className="w-full max-w-form">
        <Link to={ROUTES.home} className="mb-6 block text-center text-2xl font-bold text-brand-600">
          {APP_NAME}
        </Link>
        <Card padding="xl" className="rounded-panel">
          <Outlet />
        </Card>
      </div>
    </div>
  )
}
