import { useCallback, useEffect, useState } from 'react'

import { EMPTY_DASHBOARD_RANGE, dashboardService } from '@/services/dashboardService'
import type { DashboardDateRange, InterviewStats } from '@/types/dashboard'
import { RANGE_REVERSED_MESSAGE, isRangeReversed } from '@/utils/dateRange'

/**
 * Thống kê điểm cho dashboard, giới hạn trong khoảng ngày người dùng chọn.
 *
 * Lọc áp dụng ngay khi đổi ô ngày, không có nút "Áp dụng": ít state hơn, và lỗi
 * khoảng ngày đảo chiều hiện ra ngay thay vì đợi bấm thêm một nút.
 *
 * isLoading là state dẫn xuất: chưa có dữ liệu, chưa lỗi và đang thật sự có
 * request. Khi đổi lọc hay thử lại, dữ liệu cũ (nếu có) vẫn được giữ cho tới
 * lúc có bản mới, nên số liệu không nháy về rỗng giữa hai lần lọc.
 */
export function useDashboardStats() {
  const [range, setRange] = useState<DashboardDateRange>(EMPTY_DASHBOARD_RANGE)
  const [stats, setStats] = useState<InterviewStats | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const rangeError = isRangeReversed(range.fromDate, range.toDate) ? RANGE_REVERSED_MESSAGE : ''

  useEffect(() => {
    // Khoảng ngày đảo chiều thì không gọi backend: lỗi đã hiện ngay cạnh ô nhập,
    // và số liệu cũ vẫn ở đó trong lúc người dùng sửa lại mốc còn lại.
    if (rangeError) return

    // Cờ riêng của mỗi lần chạy effect: đổi lọc nhanh tay thì response của lọc
    // cũ bị bỏ qua, kể cả khi nó về sau response của lọc mới.
    let ignore = false
    dashboardService
      .getStats(range)
      .then((result) => {
        if (ignore) return
        setStats(result)
        setLoadError('')
      })
      .catch(() => {
        // Message của backend là tiếng Anh và chỉ có một nguyên nhân người dùng
        // làm được gì đó: thử lại.
        if (!ignore) setLoadError('Chưa tải được thống kê điểm. Hãy thử lại.')
      })
    return () => {
      ignore = true
    }
  }, [range, rangeError, reloadToken])

  const applyRange = useCallback((next: DashboardDateRange) => {
    setLoadError('')
    setRange(next)
  }, [])

  const clearRange = useCallback(() => {
    setLoadError('')
    setRange(EMPTY_DASHBOARD_RANGE)
  }, [])

  const reload = useCallback(() => {
    setLoadError('')
    setReloadToken((token) => token + 1)
  }, [])

  return {
    stats,
    range,
    rangeError,
    isLoading: stats === null && loadError === '' && rangeError === '',
    loadError,
    applyRange,
    clearRange,
    reload,
  }
}
