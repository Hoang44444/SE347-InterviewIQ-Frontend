import { useCallback, useEffect, useRef, useState } from 'react'

import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { GeneratedQuestion } from '@/types/interview'

export type GenerateErrorKind =
  'cv-not-parsed' | 'not-created' | 'not-found' | 'invalid' | 'server' | 'timeout' | 'other'

export interface GenerateError {
  kind: GenerateErrorKind
  message: string
}

/** Đổi lỗi của endpoint sinh câu hỏi thành thông báo cho người dùng. */
export function describeGenerateError(error: ApiError): GenerateError {
  switch (error.status) {
    case 400:
      return { kind: 'invalid', message: 'Số câu hỏi không hợp lệ. Hãy chọn từ 3 đến 10 câu.' }
    case 403:
      return { kind: 'other', message: 'Tài khoản không có quyền sinh câu hỏi cho phiên này.' }
    case 404:
      return { kind: 'not-found', message: 'Phiên phỏng vấn không còn khả dụng.' }
    case 409:
      return /CV has not been parsed/i.test(error.message)
        ? {
            kind: 'cv-not-parsed',
            message:
              'CV chưa được xử lý xong. Hãy chờ CV phân tích xong rồi quay lại sinh câu hỏi.',
          }
        : {
            kind: 'not-created',
            message: 'Phiên đã bắt đầu nên không thể sinh lại câu hỏi. Hãy tải lại trang.',
          }
    case 500:
      return {
        kind: 'server',
        message: 'AI gặp lỗi hoặc quá thời gian chờ. Bạn có thể thử lại.',
      }
    case 0:
      return {
        kind: 'timeout',
        message: 'Không nhận được phản hồi từ máy chủ. Hãy kiểm tra mạng rồi thử lại.',
      }
    default:
      return { kind: 'other', message: 'Không sinh được câu hỏi. Hãy thử lại sau ít phút.' }
  }
}

/** Tải và sinh bộ câu hỏi của một phiên. Remount theo `sessionPublicId` ở nơi gọi. */
export function useSessionQuestions(sessionPublicId: string) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<GenerateError | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const loadRef = useRef(0)
  const generateLock = useRef(false)
  const activeRef = useRef(false)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
      loadRef.current += 1
    }
  }, [])

  useEffect(() => {
    const request = ++loadRef.current
    interviewService
      .getSessionQuestions(sessionPublicId)
      .then((result) => {
        if (request !== loadRef.current) return
        setQuestions([...result.questions].sort((a, b) => a.orderIndex - b.orderIndex))
        setLoadError('')
      })
      .catch((cause: ApiError) => {
        if (request === loadRef.current) setLoadError(cause.message || 'Hãy thử lại.')
      })
      .finally(() => {
        if (request === loadRef.current) setIsLoading(false)
      })
  }, [sessionPublicId, reloadToken])

  const reload = useCallback(() => {
    setIsLoading(true)
    setLoadError('')
    setReloadToken((previous) => previous + 1)
  }, [])

  /** Khoá bằng ref để hai lần bấm trong cùng một render chỉ gửi một request. */
  const generate = useCallback(
    async (count?: number) => {
      if (generateLock.current) return
      generateLock.current = true
      // Một lần sinh xong thì kết quả tải trước đó không còn đáng tin.
      loadRef.current += 1
      setIsGenerating(true)
      setGenerateError(null)
      try {
        const result = await interviewService.generateQuestions(sessionPublicId, count)
        if (!activeRef.current) return
        setQuestions([...result.questions].sort((a, b) => a.orderIndex - b.orderIndex))
        setLoadError('')
        setIsLoading(false)
      } catch (cause) {
        if (!activeRef.current) return
        const error = cause as ApiError
        // 401 do apiClient xử lý bằng cách chuyển tới trang đăng nhập.
        if (error.status === 401) return
        // Giữ nguyên bộ câu hỏi cũ: backend chỉ thay khi sinh thành công.
        setGenerateError(describeGenerateError(error))
        setIsLoading(false)
      } finally {
        generateLock.current = false
        if (activeRef.current) setIsGenerating(false)
      }
    },
    [sessionPublicId],
  )

  return { questions, isLoading, loadError, isGenerating, generateError, generate, reload }
}
