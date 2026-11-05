import { useCallback, useEffect, useRef, useState } from 'react'

import { EMPTY_HISTORY_FILTER, interviewHistoryService } from '@/services/interviewHistoryService'
import type { ApiError, PageResult } from '@/types/api'
import type { InterviewHistoryFilter, InterviewHistoryItem } from '@/types/history'

/**
 * Danh sách lịch sử: giữ trang hiện tại, bộ lọc, và chống chồng response.
 *
 * Bộ lọc áp dụng ngay khi người dùng đổi, không có nút "Áp dụng": ít state hơn,
 * và lỗi khoảng ngày đảo chiều hiện ra ngay thay vì đợi bấm thêm một nút.
 *
 * Không setState đồng bộ trong effect: cờ isLoading do chính các handler bật
 * trước khi đổi tham số, effect chỉ set state trong then/catch/finally.
 */
export function useInterviewHistory() {
  const [pageNumber, setPageNumber] = useState(1)
  const [filter, setFilter] = useState<InterviewHistoryFilter>(EMPTY_HISTORY_FILTER)
  const [page, setPage] = useState<PageResult<InterviewHistoryItem> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  /**
   * Đổi lọc nhanh tay thì nhiều request chạy cùng lúc và response của lọc cũ có
   * thể về sau. Mỗi lần gọi mang một số thứ tự; chỉ response của số mới nhất
   * được ghi vào state.
   */
  const requestRef = useRef(0)

  const load = useCallback(() => {
    const request = ++requestRef.current
    return interviewHistoryService
      .list(pageNumber, filter)
      .then((result) => {
        if (request !== requestRef.current) return
        setPage(result)
        setLoadError('')
      })
      .catch((cause: ApiError) => {
        // Giữ nguyên danh sách cũ thay vì xoá trắng: người dùng còn thấy kết quả
        // lần lọc trước trong lúc sửa lại khoảng ngày.
        if (request === requestRef.current) setLoadError(cause.message || 'Hãy thử lại.')
      })
      .finally(() => {
        if (request === requestRef.current) setIsLoading(false)
      })
  }, [pageNumber, filter])

  useEffect(() => {
    void load()
    return () => {
      requestRef.current += 1
    }
  }, [load, reloadToken])

  /** Đổi lọc luôn về trang 1: lọc mới có thể ít trang hơn trang đang xem. */
  const applyFilter = useCallback((next: InterviewHistoryFilter) => {
    setIsLoading(true)
    setLoadError('')
    setFilter(next)
    setPageNumber(1)
  }, [])

  const clearFilter = useCallback(() => {
    setIsLoading(true)
    setLoadError('')
    setFilter(EMPTY_HISTORY_FILTER)
    setPageNumber(1)
  }, [])

  const changePage = useCallback((next: number) => {
    setIsLoading(true)
    setLoadError('')
    setPageNumber(Math.max(1, next))
  }, [])

  const reload = useCallback(() => {
    setIsLoading(true)
    setLoadError('')
    setReloadToken((token) => token + 1)
  }, [])

  return {
    items: page?.items ?? [],
    page,
    filter,
    pageNumber,
    isLoading,
    loadError,
    applyFilter,
    clearFilter,
    changePage,
    reload,
  }
}
