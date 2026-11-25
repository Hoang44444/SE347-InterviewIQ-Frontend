import { useCallback, useEffect, useState } from 'react'

import { dashboardService } from '@/services/dashboardService'
import type { InterviewStats } from '@/types/dashboard'

/**
 * Thống kê điểm cho dashboard.
 *
 * isLoading là state dẫn xuất: chưa có dữ liệu và chưa lỗi. Khi thử lại, dữ
 * liệu cũ (nếu có) vẫn được giữ cho tới lúc có bản mới.
 */
export function useDashboardStats() {
  const [stats, setStats] = useState<InterviewStats | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let ignore = false
    dashboardService
      .getStats()
      .then((result) => {
        if (!ignore) setStats(result)
      })
      .catch(() => {
        // Message của backend là tiếng Anh và chỉ có một nguyên nhân người dùng
        // làm được gì đó: thử lại.
        if (!ignore) setLoadError('Chưa tải được thống kê điểm. Hãy thử lại.')
      })
    return () => {
      ignore = true
    }
  }, [reloadToken])

  const reload = useCallback(() => {
    setLoadError('')
    setReloadToken((token) => token + 1)
  }, [])

  return { stats, isLoading: stats === null && loadError === '', loadError, reload }
}
