import { Outlet, useNavigate } from 'react-router-dom'

import { Button, Container, Navbar, type NavItem } from '@/components/ui'
import { APP_NAME } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Tổng quan' },
  { to: ROUTES.interviews, label: 'Phòng phỏng vấn' },
  { to: ROUTES.profile, label: 'Hồ sơ' },
  { to: ROUTES.designSystem, label: 'Design system' },
]

export function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  async function handleLogout() {
    await logout()
    toast.success('Đã đăng xuất')
    navigate(ROUTES.login)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        brand={APP_NAME}
        brandTo={ROUTES.home}
        items={isAuthenticated ? NAV_ITEMS : []}
        actions={
          isAuthenticated ? (
            <>
              <span className="hidden text-sm text-content-muted sm:inline">{user?.fullName}</span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate(ROUTES.login)}>
              Đăng nhập
            </Button>
          )
        }
      />

      <main className="flex-1 py-8">
        <Container>
          <Outlet />
        </Container>
      </main>

      <footer className="border-t border-border bg-surface py-4">
        <p className="text-center text-sm text-content-subtle">
          &copy; {new Date().getFullYear()} {APP_NAME} &middot; Đồ án SE347
        </p>
      </footer>
    </div>
  )
}
