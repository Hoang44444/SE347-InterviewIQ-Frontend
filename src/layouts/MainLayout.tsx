import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Button, Container, Navbar, StudioBackdrop, type NavItem } from '@/components/ui'
import { APP_NAME } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate'
import { ROUTES } from '@/routes/paths'

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Tổng quan' },
  { to: ROUTES.interviews, label: 'Phòng phỏng vấn' },
  { to: ROUTES.cvs, label: 'CV của tôi' },
  { to: ROUTES.profile, label: 'Hồ sơ' },
  { to: ROUTES.designSystem, label: 'Design system' },
]

export function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const navigateWithTransition = useViewTransitionNavigate()
  const toast = useToast()

  async function handleLogout() {
    await logout()
    toast.success('Đã đăng xuất')
    navigate(ROUTES.login)
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/*
       * Nền studio đặt ở layout để không gắn lại khi chuyển trang. Trang chủ được
       * đủ đèn và chuyển động; các trang làm việc chỉ giữ quầng đèn tĩnh cho dịu mắt.
       */}
      <StudioBackdrop light={pathname === ROUTES.home ? 'stage' : 'quiet'} />
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
            <Button size="sm" onClick={() => navigateWithTransition(ROUTES.login)}>
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
