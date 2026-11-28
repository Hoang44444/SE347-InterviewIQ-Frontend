import { useCallback, useEffect, useMemo, useState } from 'react'

import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { InterviewHistoryDetail, InterviewHistoryQuestion } from '@/types/history'
import { fromGeneratedQuestions, parseHistoryQuestions } from '@/utils/historyQuestions'

/** Buổi không có bộ câu hỏi nào để đọc — không phải hệ thống lỗi. */
const NO_QUESTION_STATUSES = [400, 403, 404]

/**
 * Danh sách câu hỏi kèm câu trả lời của một buổi phỏng vấn.
 *
 * Hai nguồn, theo thứ tự ưu tiên:
 *
 * 1. `detail.questions` của API lịch sử. Đây là nguồn duy nhất có kèm video và
 *    transcript, nên khi nó có dữ liệu thì không gọi thêm request nào.
 * 2. `GET /interview-session/:id/questions`, dùng khi nguồn trên còn rỗng —
 *    backend hiện luôn trả `[]` ở đó. Endpoint này chỉ có nội dung câu hỏi,
 *    không có câu trả lời, nên UI hiện danh sách câu hỏi và nói rõ là chưa đọc
 *    được bản ghi trả lời.
 *
 * Nhờ vậy khi module Scoring đổ dữ liệu vào `detail.questions` thì trang tự
 * dùng nguồn đầy đủ hơn mà không phải sửa gì ở đây.
 */
export function useHistoryQuestions(detail: InterviewHistoryDetail | null) {
  const sessionId = detail?.id ?? null
  const embedded = useMemo(
    () => (detail === null ? [] : parseHistoryQuestions(detail.questions)),
    [detail],
  )
  const hasEmbedded = embedded.length > 0

  const [fetched, setFetched] = useState<{
    sessionId: string
    questions: InterviewHistoryQuestion[]
  } | null>(null)
  const [loadError, setLoadError] = useState('')
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const shouldFetch = sessionId !== null && !hasEmbedded
  // So id để lúc đổi sang buổi khác không hiện câu hỏi của buổi trước đó.
  const current = fetched !== null && fetched.sessionId === sessionId ? fetched.questions : null

  useEffect(() => {
    if (!shouldFetch || sessionId === null) return

    let ignore = false
    interviewService
      .getSessionQuestions(sessionId)
      .then((data) => {
        if (ignore) return
        const questions = Array.isArray(data.questions) ? data.questions : []
        setFetched({ sessionId, questions: fromGeneratedQuestions(questions) })
      })
      .catch((cause: ApiError) => {
        if (ignore) return
        if (NO_QUESTION_STATUSES.includes(cause.status)) setIsUnavailable(true)
        else setLoadError(cause.message || 'Hãy thử lại.')
      })

    return () => {
      ignore = true
    }
  }, [sessionId, shouldFetch, reloadToken])

  const reload = useCallback(() => {
    setLoadError('')
    setIsUnavailable(false)
    setReloadToken((token) => token + 1)
  }, [])

  return {
    questions: hasEmbedded ? embedded : (current ?? []),
    /** Nguồn nhúng có sẵn thì không có gì phải chờ. */
    isLoading: shouldFetch && current === null && !isUnavailable && loadError === '',
    loadError,
    /** true khi dữ liệu đang hiện không kèm câu trả lời nào đọc được. */
    isAnswerless: !hasEmbedded,
    reload,
  }
}
