import { useEffect, useRef, useState } from 'react'

import { QUESTION_COUNT_DEFAULT } from '@/constants/interview'
import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { GeneratedQuestion } from '@/types/interview'
import { isSessionId } from '@/utils/sessionId'

export type GenerateErrorKind =
  'cv-not-parsed' | 'not-created' | 'not-found' | 'invalid' | 'forbidden' | 'failed'

export interface GenerateError {
  kind: GenerateErrorKind
  message: string
}

/** Các lỗi cho phép người dùng bấm thử lại ngay. */
export const RETRYABLE_GENERATE_ERRORS: readonly GenerateErrorKind[] = ['cv-not-parsed', 'failed']

/**
 * Backend dùng chung code CONFLICT cho "CV chưa parse" và "phiên không còn CREATED",
 * hiện chỉ phân biệt được bằng message. Gom về một chỗ để đổi sang code riêng khi BE thêm.
 */
function isCvNotParsed(error: ApiError): boolean {
  return /cv has not been parsed/i.test(error.message ?? '')
}

export function toGenerateError(error: ApiError): GenerateError | null {
  switch (error.status) {
    case 401:
      return null // Interceptor hiện có chuyển tới đăng nhập.
    case 400:
      return {
        kind: 'invalid',
        message: error.errors
          ? 'Số lượng câu hỏi không hợp lệ (chọn từ 3 đến 10)'
          : 'Thông tin phiên phỏng vấn không hợp lệ',
      }
    case 403:
      return { kind: 'forbidden', message: 'Bạn không có quyền tạo câu hỏi cho phiên này' }
    case 404:
      return { kind: 'not-found', message: 'Phiên phỏng vấn không còn khả dụng' }
    case 409:
      return isCvNotParsed(error)
        ? {
            kind: 'cv-not-parsed',
            message: 'CV chưa được phân tích xong. Hãy thử lại sau ít phút',
          }
        : {
            kind: 'not-created',
            message: 'Phiên đã bắt đầu nên không thể tạo lại câu hỏi',
          }
    default:
      return { kind: 'failed', message: 'Không tạo được câu hỏi, hãy thử lại' }
  }
}

export function useSessionQuestions({
  sessionPublicId,
  reload,
  onGenerated,
}: {
  sessionPublicId: string
  /** Đồng bộ lại phiên khi 404/409 cho biết trạng thái FE đã cũ. */
  reload: () => Promise<void>
  onGenerated: (total: number) => void
}) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [isLoading, setIsLoading] = useState(() => isSessionId(sessionPublicId))
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [generateError, setGenerateError] = useState<GenerateError | null>(null)
  const pendingRef = useRef(false)
  const requestRef = useRef(0)
  const activeRef = useRef(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    activeRef.current = true
    const request = ++requestRef.current
    if (isSessionId(sessionPublicId)) {
      interviewService
        .getSessionQuestions(sessionPublicId)
        .then((result) => {
          if (request !== requestRef.current) return
          setQuestions(result.questions)
          setLoadError('')
        })
        .catch((cause: ApiError) => {
          if (request !== requestRef.current) return
          setLoadError(
            cause.status === 404
              ? 'Phiên phỏng vấn không còn khả dụng'
              : 'Chưa tải được câu hỏi. Hãy thử lại',
          )
        })
        .finally(() => {
          if (request === requestRef.current) setIsLoading(false)
        })
    }
    return () => {
      activeRef.current = false
      requestRef.current += 1
    }
  }, [sessionPublicId, reloadToken])

  function retryLoad() {
    setIsLoading(true)
    setReloadToken((token) => token + 1)
  }

  async function generate(count: number = QUESTION_COUNT_DEFAULT) {
    // Khoá đồng bộ trước render để double-click không gửi hai request.
    if (pendingRef.current || !activeRef.current || !isSessionId(sessionPublicId)) return
    pendingRef.current = true
    const request = ++requestRef.current
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const result = await interviewService.generateSessionQuestions(sessionPublicId, { count })
      if (!activeRef.current || request !== requestRef.current) return
      setQuestions(result.questions)
      setLoadError('')
      setIsLoading(false)
      onGenerated(result.questions.length)
    } catch (cause) {
      if (!activeRef.current || request !== requestRef.current) return
      const error = toGenerateError(cause as ApiError)
      setGenerateError(error)
      if (error?.kind === 'not-created' || error?.kind === 'not-found') {
        await reload().catch(() => {})
      }
    } finally {
      if (activeRef.current && request === requestRef.current) setIsGenerating(false)
      pendingRef.current = false
    }
  }

  return {
    questions,
    isLoading,
    isGenerating,
    loadError,
    generateError,
    generate,
    retryLoad,
  }
}
