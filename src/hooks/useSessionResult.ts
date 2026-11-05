import { useCallback, useEffect, useState } from 'react'

import { scoringService } from '@/services/scoringService'
import type { ApiError } from '@/types/api'
import type { SessionResult } from '@/types/scoring'

/** 400 "chưa chấm xong", 403 "không phải của bạn", 404 "chưa có kết quả". */
const NO_RESULT_STATUSES = [400, 403, 404]

/**
 * Điểm và nhận xét của một buổi phỏng vấn, tải riêng khỏi chi tiết lịch sử.
 *
 * API lịch sử đã chừa sẵn field score và summary nhưng hiện luôn trả null; trong
 * lúc Scoring module chưa đổ dữ liệu vào đó, trang chi tiết lấy trực tiếp từ
 * endpoint của Scoring. Khi detail.score có dữ liệu thật thì bỏ hook này.
 *
 * enabled là false thì không gọi gì: chỉ buổi đã hoàn thành mới có kết quả, gọi
 * cho buổi đang dở chỉ nhận về 400.
 */
export function useSessionResult(sessionId: string | null, enabled: boolean) {
  const [result, setResult] = useState<SessionResult | null>(null)
  const [loadError, setLoadError] = useState('')
  /** Backend trả lời rõ là chưa có kết quả — khác với không gọi được. */
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const isEnabled = sessionId !== null && enabled
  const current = result !== null && result.sessionId === sessionId ? result : null

  useEffect(() => {
    if (!isEnabled) return

    let ignore = false
    scoringService
      .getSessionResult(sessionId)
      .then((data) => {
        if (!ignore) setResult(data)
      })
      .catch((cause: ApiError) => {
        if (ignore) return
        // Ba mã này nghĩa là "chưa có gì để hiện", không phải hệ thống lỗi: để
        // chúng rơi vào loadError thì trang hiện báo đỏ cho một buổi chỉ mới nộp.
        if (NO_RESULT_STATUSES.includes(cause.status)) setIsUnavailable(true)
        else setLoadError(cause.message || 'Hãy thử lại.')
      })

    return () => {
      ignore = true
    }
  }, [sessionId, isEnabled, reloadToken])

  const reload = useCallback(() => {
    setLoadError('')
    setIsUnavailable(false)
    setReloadToken((token) => token + 1)
  }, [])

  return {
    result: current,
    isLoading: isEnabled && current === null && !isUnavailable && loadError === '',
    loadError,
    isUnavailable,
    reload,
  }
}
