import { Link } from 'react-router-dom'

import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ROUTES } from '@/routes/paths'

export function NotFoundPage() {
  useDocumentTitle('Không tìm thấy trang')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="text-2xl font-semibold text-content">Không tìm thấy trang này</h1>
      <p className="text-content-muted">Đường dẫn có thể đã bị đổi hoặc không còn tồn tại.</p>
      <Link
        to={ROUTES.home}
        className="mt-2 rounded-control bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700"
      >
        Về trang chủ
      </Link>
    </div>
  )
}
