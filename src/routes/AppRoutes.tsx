import { Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './ProtectedRoute'
import { ROUTES } from './paths'

import { AuthLayout } from '@/layouts/AuthLayout'
import { MainLayout } from '@/layouts/MainLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { CvPage } from '@/pages/cv/CvPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyRegistrationPage } from '@/pages/auth/VerifyRegistrationPage'
import { InterviewListPage } from '@/pages/interview/InterviewListPage'
import { InterviewRoomPage } from '@/pages/interview/InterviewRoomPage'
import { InterviewRoomDemoPage } from '@/pages/interview/InterviewRoomDemoPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* Trang công khai */}
      <Route element={<MainLayout />}>
        <Route path={ROUTES.home} element={<HomePage />} />
        {/* Bảng tra cứu design system, để mở cho cả team xem được */}
        <Route path={ROUTES.designSystem} element={<DesignSystemPage />} />
        {import.meta.env.DEV && (
          <Route path={ROUTES.devInterviewRoom} element={<InterviewRoomDemoPage />} />
        )}
      </Route>

      {/* Trang đăng nhập / đăng ký */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.registerVerify} element={<VerifyRegistrationPage />} />
      </Route>

      {/* Trang cần đăng nhập */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.cvs} element={<CvPage />} />
          <Route path={ROUTES.interviews} element={<InterviewListPage />} />
          <Route path="/interviews/:id" element={<InterviewRoomPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
