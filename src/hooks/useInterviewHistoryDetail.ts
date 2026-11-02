import { useCallback, useEffect, useState } from 'react'

import { interviewHistoryService } from '@/services/interviewHistoryService'
import type { ApiError } from '@/types/api'
import type { InterviewHistoryDetail } from '@/types/history'
import { isSessionId } from '@/utils/sessionId'

/**
 * Chi tiết một buổi phỏng vấn.
 *
 * Tách "không tìm thấy" khỏi "lỗi tải": cái đầu là một màn hình riêng có đường
 * về danh sách, cái sau là một thông báo kèm nút thử lại. Gộp hai thứ lại thì
 * người dùng bấm "Thử lại" mãi cho một id không bao giờ tồn tại.
 *
 * isLoading là state dẫn xuất chứ không phải một useState riêng. Nhờ vậy effect
 * không phải setState đồng bộ, và lúc đổi sang một id khác mà component không
 * remount thì vẫn ra "đang tải" chứ không hiện dữ liệu của buổi trước đó.
 */
export function useInterviewHistoryDetail(id: string | undefined) {
  const [detail, setDetail] = useState<InterviewHistoryDetail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  // Backend chặn id sai định dạng bằng 400 trước khi chạm database, nên kiểm ở
  // đây luôn: khỏi một request chắc chắn thất bại.
  const isValidId = id !== undefined && isSessionId(id)
  const current = detail !== null && detail.id === id ? detail : null

  useEffect(() => {
    if (!isValidId) return

    let ignore = false
    interviewHistoryService
      .getById(id)
      .then((result) => {
        if (!ignore) setDetail(result)
      })
      .catch((cause: ApiError) => {
        if (ignore) return
        // 404 là cả "không tồn tại" và "của người khác" — backend cố ý không
        // phân biệt, nên UI cũng không được đoán.
        if (cause.status === 404 || cause.status === 400) setNotFound(true)
        else setLoadError(cause.message || 'Hãy thử lại.')
      })

    return () => {
      ignore = true
    }
  }, [id, isValidId, reloadToken])

  const reload = useCallback(() => {
    setLoadError('')
    setNotFound(false)
    setReloadToken((token) => token + 1)
  }, [])

  return {
    detail: current,
    isLoading: isValidId && current === null && !notFound && loadError === '',
    loadError,
    isNotFound: !isValidId || notFound,
    reload,
  }
}
