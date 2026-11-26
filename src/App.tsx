import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AuthProvider } from '@/contexts/AuthProvider'
import { ToastProvider } from '@/contexts/ToastProvider'
import { AppRoutes } from '@/routes/AppRoutes'

/*
 * Data router để dùng được useBlocker (hỏi lại trước khi rời phòng phỏng vấn). Các
 * route vẫn khai báo trong AppRoutes, nên ở đây chỉ cần một route bắt tất cả.
 */
const router = createBrowserRouter([{ path: '*', element: <AppRoutes /> }])

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        {/* Cập nhật route đồng bộ để useViewTransitionNavigate chụp được trang mới. */}
        <RouterProvider router={router} useTransitions={false} />
      </AuthProvider>
    </ToastProvider>
  )
}
