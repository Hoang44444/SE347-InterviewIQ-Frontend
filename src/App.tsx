import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '@/contexts/AuthProvider'
import { ToastProvider } from '@/contexts/ToastProvider'
import { AppRoutes } from '@/routes/AppRoutes'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        {/* Cập nhật route đồng bộ để useViewTransitionNavigate chụp được trang mới. */}
        <BrowserRouter useTransitions={false}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
