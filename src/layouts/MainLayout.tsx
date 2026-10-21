import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { Button, Container, Modal, Navbar, type NavItem } from '@/components/ui'
import { APP_NAME } from '@/constants'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
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
  const toast = useToast()
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleConfirmLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch {
      // Gọi API lỗi thì logout() vẫn đã xoá phiên ở máy này, nên vẫn coi như đã đăng xuất.
    } finally {
      setIsLoggingOut(false)
      setIsLogoutOpen(false)
    }
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
              <span className="hidden text-sm text-content-muted sm:inline">
                {user?.fullName ?? user?.email}
              </span>
              <Button variant="secondary" size="sm" onClick={() => setIsLogoutOpen(true)}>
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

      {/* Hỏi lại trước khi đăng xuất. Không cho đóng hộp trong lúc đang gọi API. */}
      <Modal
        open={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        title="Đăng xuất?"
        description="Bạn sẽ cần đăng nhập lại để tiếp tục luyện phỏng vấn."
        size="sm"
        dismissible={!isLoggingOut}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsLogoutOpen(false)}
              disabled={isLoggingOut}
            >
              Hủy
            </Button>
            <Button onClick={handleConfirmLogout} isLoading={isLoggingOut}>
              Đăng xuất
            </Button>
          </>
        }
      />
    </div>
  )
}
