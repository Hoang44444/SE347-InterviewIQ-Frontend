import { Outlet } from 'react-router-dom'

import { Card, StudioBackdrop, TransitionLink } from '@/components/ui'
import { APP_NAME } from '@/constants'
import { ROUTES } from '@/routes/paths'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <StudioBackdrop light="soft" />
      <div className="w-full max-w-form">
        <TransitionLink
          to={ROUTES.home}
          className="mb-6 block text-center text-2xl font-bold text-brand-600"
        >
          {APP_NAME}
        </TransitionLink>
        <Card padding="xl" className="animate-rise-in rounded-panel stagger-1">
          <Outlet />
        </Card>
      </div>
    </div>
  )
}
