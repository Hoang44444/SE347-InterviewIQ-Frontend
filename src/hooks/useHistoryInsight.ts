import { useCallback, useEffect, useState } from 'react'

import { dashboardService } from '@/services/dashboardService'
import type { ApiError } from '@/types/api'
import type { HistoryInsightState } from '@/types/dashboard'

/** Backend trả message tiếng Anh; đổi theo status để người dùng biết làm gì tiếp. */
function refreshErrorMessage(cause: ApiError): string {
  if (cause.status === 429) {
    return 'Bạn vừa tạo nhận xét nhiều lần hoặc AI đang quá tải. Hãy thử lại sau ít phút.'
  }
  if (cause.status === 400) {
    return 'Cần thêm buổi phỏng vấn đã chấm xong trước khi tạo nhận xét.'
  }
  return 'Chưa tạo được nhận xét. Nhận xét cũ (nếu có) vẫn được giữ, hãy thử lại.'
}

/**
 * Nhận xét AI tổng hợp trên dashboard.
 *
 * Tải bằng GET (không tốn lượt gọi AI). Chỉ khi người dùng bấm nút mới gọi
 * POST, vì POST có thể làm backend gọi AI và bị giới hạn số lần mỗi giờ.
 */
export function useHistoryInsight() {
  const [state, setState] = useState<HistoryInsightState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let ignore = false
    dashboardService
      .getInsight()
      .then((result) => {
        if (!ignore) setState(result)
      })
      .catch(() => {
        if (!ignore) setLoadError('Chưa tải được nhận xét tổng hợp. Hãy thử lại.')
      })
    return () => {
      ignore = true
    }
  }, [reloadToken])

  const reload = useCallback(() => {
    setLoadError('')
    setReloadToken((token) => token + 1)
  }, [])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setRefreshError('')
    try {
      setState(await dashboardService.refreshInsight())
    } catch (cause) {
      setRefreshError(refreshErrorMessage(cause as ApiError))
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  return {
    state,
    isLoading: state === null && loadError === '',
    loadError,
    reload,
    refresh,
    isRefreshing,
    refreshError,
  }
}
