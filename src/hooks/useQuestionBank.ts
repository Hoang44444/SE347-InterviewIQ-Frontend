import { useCallback, useEffect, useRef, useState } from 'react'

import { BANK_PAGE_SIZE, BANK_SEARCH_DEBOUNCE_MS } from '@/constants/questionBank'
import { EMPTY_BANK_FILTER, questionBankService } from '@/services/questionBankService'
import type { ApiError } from '@/types/api'
import type { BankFilter, BankItem, BankPage } from '@/types/questionBank'
import {
  describeBankDeleteError,
  describeBankListError,
  type BankError,
} from '@/utils/questionBankErrors'

export type RemoveBankItemResult = { ok: true } | { ok: false; error: BankError }

export interface UseQuestionBankOptions {
  pageSize?: number
}

/**
 * Danh sách ngân hàng câu hỏi: trang hiện tại, bộ lọc, ô tìm kiếm có debounce,
 * chống chồng response và xoá từng câu. Theo mẫu `useInterviewHistory`.
 *
 * Không setState đồng bộ trong effect: cờ isLoading do chính các handler bật
 * trước khi đổi tham số, effect chỉ set state trong then/catch/finally.
 */
export function useQuestionBank({ pageSize = BANK_PAGE_SIZE }: UseQuestionBankOptions = {}) {
  const [pageNumber, setPageNumber] = useState(1)
  const [filter, setFilter] = useState<BankFilter>(EMPTY_BANK_FILTER)
  const [searchText, setSearchTextState] = useState('')
  const [page, setPage] = useState<BankPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  /** Mỗi lần gọi mang một số thứ tự; chỉ response của số mới nhất được ghi vào state. */
  const requestRef = useRef(0)
  const filterRef = useRef(filter)
  const searchTimerRef = useRef<number | undefined>(undefined)
  const deleteLock = useRef(false)
  const activeRef = useRef(false)
  const pageRef = useRef(page)

  useEffect(() => {
    filterRef.current = filter
    pageRef.current = page
  })

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
      window.clearTimeout(searchTimerRef.current)
    }
  }, [])

  const load = useCallback(() => {
    const request = ++requestRef.current
    return questionBankService
      .list(pageNumber, filter, pageSize)
      .then((result) => {
        if (request !== requestRef.current) return
        setPage(result)
        setLoadError('')
      })
      .catch((cause: ApiError) => {
        // Giữ danh sách cũ khi lỗi: người dùng vẫn thấy kết quả lần trước.
        if (request === requestRef.current) setLoadError(describeBankListError(cause).message)
      })
      .finally(() => {
        if (request === requestRef.current) setIsLoading(false)
      })
  }, [pageNumber, filter, pageSize])

  useEffect(() => {
    void load()
    return () => {
      requestRef.current += 1
    }
  }, [load, reloadToken])

  /** Đổi lọc luôn về trang 1: lọc mới có thể ít trang hơn trang đang xem. */
  const applyFilter = useCallback((next: BankFilter) => {
    setIsLoading(true)
    setLoadError('')
    setFilter(next)
    setPageNumber(1)
  }, [])

  const setDomain = useCallback(
    (domain: BankFilter['domain']) => applyFilter({ ...filterRef.current, domain }),
    [applyFilter],
  )

  const setDifficulty = useCallback(
    (difficulty: BankFilter['difficulty']) => applyFilter({ ...filterRef.current, difficulty }),
    [applyFilter],
  )

  /** Gõ tới đâu hiện tới đó, nhưng chỉ gọi API khi người dùng ngừng gõ. */
  const setSearchText = useCallback(
    (text: string) => {
      setSearchTextState(text)
      window.clearTimeout(searchTimerRef.current)
      searchTimerRef.current = window.setTimeout(() => {
        if (!activeRef.current) return
        // Không đổi gì (vd. chỉ thêm khoảng trắng) thì khỏi gọi lại.
        if (text.trim() === filterRef.current.search.trim()) return
        applyFilter({ ...filterRef.current, search: text })
      }, BANK_SEARCH_DEBOUNCE_MS)
    },
    [applyFilter],
  )

  const clearFilter = useCallback(() => {
    window.clearTimeout(searchTimerRef.current)
    setSearchTextState('')
    applyFilter(EMPTY_BANK_FILTER)
  }, [applyFilter])

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

  /**
   * Xoá một câu. Khoá bằng ref nên hai lần bấm trong cùng một render chỉ gửi
   * một request. Xoá xong tải lại; nếu đó là câu cuối của trang sau thì lùi một
   * trang để không đứng ở trang rỗng.
   */
  const remove = useCallback(
    async (item: BankItem): Promise<RemoveBankItemResult | undefined> => {
      if (deleteLock.current) return undefined
      deleteLock.current = true
      setDeletingId(item.id)
      try {
        await questionBankService.remove(item.id)
      } catch (cause) {
        const error = cause as ApiError
        // 401 do apiClient xử lý bằng cách chuyển tới trang đăng nhập.
        if (error.status === 401) return undefined
        return { ok: false, error: describeBankDeleteError(error) }
      } finally {
        deleteLock.current = false
        if (activeRef.current) setDeletingId(null)
      }
      if (activeRef.current) {
        const current = pageRef.current
        if (current && current.items.length === 1 && current.currentPage > 1) {
          changePage(current.currentPage - 1)
        } else {
          reload()
        }
      }
      return { ok: true }
    },
    [changePage, reload],
  )

  return {
    items: page?.items ?? [],
    page,
    filter,
    searchText,
    pageNumber,
    isLoading,
    loadError,
    deletingId,
    setDomain,
    setDifficulty,
    setSearchText,
    clearFilter,
    changePage,
    reload,
    remove,
  }
}
