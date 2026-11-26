import { useCallback, useEffect, useRef, useState } from 'react'

import { interviewService } from '@/services/interviewService'
import { questionBankService } from '@/services/questionBankService'
import type { ApiError } from '@/types/api'
import type {
  GeneratedQuestion,
  GenerateQuestionsOptions,
  RegenerateQuestionOptions,
  SessionQuestions,
} from '@/types/interview'
import type { SaveToBankResult } from '@/types/questionBank'
import {
  describeFromBankError,
  describeSaveToBankError,
  type BankError,
} from '@/utils/questionBankErrors'

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

/**
 * Đổi lỗi của endpoint sinh lại một câu thành thông báo cho người dùng.
 * Khác generate ở 400 (lĩnh vực/độ khó), 404 (có thể là câu không thuộc phiên)
 * và 500 (câu cũ được giữ nguyên).
 */
export function describeRegenerateError(error: ApiError): GenerateError {
  switch (error.status) {
    case 400:
      return {
        kind: 'invalid',
        message: 'Lĩnh vực hoặc độ khó đã chọn không hợp lệ. Hãy chọn lại rồi thử lại.',
      }
    case 403:
      return { kind: 'other', message: 'Tài khoản không có quyền sinh lại câu hỏi này.' }
    case 404:
      return {
        kind: 'not-found',
        message: 'Câu hỏi hoặc phiên không còn khả dụng. Hãy tải lại trang.',
      }
    case 409:
      return /CV has not been parsed/i.test(error.message)
        ? {
            kind: 'cv-not-parsed',
            message: 'CV chưa được xử lý xong. Hãy chờ CV phân tích xong rồi sinh lại câu này.',
          }
        : {
            kind: 'not-created',
            message: 'Phiên đã bắt đầu nên không thể sinh lại câu hỏi. Hãy tải lại trang.',
          }
    case 500:
      return {
        kind: 'server',
        message: 'AI gặp lỗi hoặc quá thời gian chờ. Câu cũ được giữ nguyên, bạn có thể thử lại.',
      }
    case 0:
      return {
        kind: 'timeout',
        message: 'Không nhận được phản hồi từ máy chủ. Hãy kiểm tra mạng rồi thử lại.',
      }
    default:
      return { kind: 'other', message: 'Không sinh lại được câu này. Hãy thử lại sau ít phút.' }
  }
}

export interface RegenerateFailure {
  questionPublicId: string
  error: GenerateError
}

export type SaveToBankOutcome =
  { ok: true; result: SaveToBankResult } | { ok: false; error: BankError }

export type ReplaceFromBankOutcome = { ok: true } | { ok: false; error: BankError }

function sortSet(result: SessionQuestions): GeneratedQuestion[] {
  return [...result.questions].sort((a, b) => a.orderIndex - b.orderIndex)
}

/**
 * Tải và thay đổi bộ câu hỏi của một phiên: sinh cả bộ, sinh lại một câu, dùng
 * câu từ ngân hàng, lưu vào ngân hàng. Remount theo `sessionPublicId` ở nơi gọi.
 *
 * Mọi thao tác ghi dùng chung một khoá ref: chỉ một thao tác chạy tại một thời
 * điểm, nên bấm đúp hay bấm hai nút khác nhau trong cùng một render cũng chỉ gửi
 * một request. Lỗi luôn giữ nguyên bộ câu hỏi đang hiển thị.
 */
export function useSessionQuestions(sessionPublicId: string) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<GenerateError | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [regenerateFailure, setRegenerateFailure] = useState<RegenerateFailure | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const loadRef = useRef(0)
  const opLock = useRef(false)
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
        setQuestions(sortSet(result))
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

  /** Ghi bộ mới trả về từ backend; kết quả tải trước đó không còn đáng tin. */
  const applyQuestions = useCallback((result: SessionQuestions) => {
    loadRef.current += 1
    setQuestions(sortSet(result))
    setLoadError('')
    setIsLoading(false)
  }, [])

  const generate = useCallback(
    async (options: GenerateQuestionsOptions = {}) => {
      if (opLock.current) return
      opLock.current = true
      loadRef.current += 1
      setIsGenerating(true)
      setGenerateError(null)
      setRegenerateFailure(null)
      try {
        const result = await interviewService.generateQuestions(sessionPublicId, options)
        if (!activeRef.current) return
        applyQuestions(result)
      } catch (cause) {
        if (!activeRef.current) return
        const error = cause as ApiError
        // 401 do apiClient xử lý bằng cách chuyển tới trang đăng nhập.
        if (error.status === 401) return
        // Giữ nguyên bộ câu hỏi cũ: backend chỉ thay khi sinh thành công.
        setGenerateError(describeGenerateError(error))
        setIsLoading(false)
      } finally {
        opLock.current = false
        if (activeRef.current) setIsGenerating(false)
      }
    },
    [sessionPublicId, applyQuestions],
  )

  const regenerate = useCallback(
    async (questionPublicId: string, options: RegenerateQuestionOptions = {}) => {
      if (opLock.current) return
      opLock.current = true
      loadRef.current += 1
      setRegeneratingId(questionPublicId)
      setGenerateError(null)
      setRegenerateFailure(null)
      try {
        const result = await interviewService.regenerateQuestion(
          sessionPublicId,
          questionPublicId,
          options,
        )
        if (!activeRef.current) return
        applyQuestions(result)
      } catch (cause) {
        if (!activeRef.current) return
        const error = cause as ApiError
        if (error.status === 401) return
        // Câu cũ được giữ nguyên cả ở backend lẫn trên màn hình.
        setRegenerateFailure({ questionPublicId, error: describeRegenerateError(error) })
        setIsLoading(false)
      } finally {
        opLock.current = false
        if (activeRef.current) setRegeneratingId(null)
      }
    },
    [sessionPublicId, applyQuestions],
  )

  /** Lưu cả bộ (bỏ trống ids) hoặc một số câu vào ngân hàng. Trả `undefined` nếu bị chặn. */
  const saveToBank = useCallback(
    async (questionPublicIds?: string[]): Promise<SaveToBankOutcome | undefined> => {
      if (opLock.current) return undefined
      opLock.current = true
      setIsSaving(true)
      try {
        const result = await questionBankService.saveFromSession({
          sessionPublicId,
          ...(questionPublicIds ? { questionPublicIds } : {}),
        })
        return { ok: true, result }
      } catch (cause) {
        const error = cause as ApiError
        if (error.status === 401) return undefined
        return { ok: false, error: describeSaveToBankError(error) }
      } finally {
        opLock.current = false
        if (activeRef.current) setIsSaving(false)
      }
    },
    [sessionPublicId],
  )

  /** Thay toàn bộ bộ câu hỏi bằng các câu của ngân hàng, đúng thứ tự `itemPublicIds`. */
  const replaceFromBank = useCallback(
    async (itemPublicIds: string[]): Promise<ReplaceFromBankOutcome | undefined> => {
      if (opLock.current) return undefined
      opLock.current = true
      loadRef.current += 1
      setIsReplacing(true)
      setGenerateError(null)
      setRegenerateFailure(null)
      try {
        const result = await questionBankService.useInSession(sessionPublicId, itemPublicIds)
        if (activeRef.current) applyQuestions(result)
        return { ok: true }
      } catch (cause) {
        const error = cause as ApiError
        if (error.status === 401) return undefined
        // Backend không đổi gì khi lỗi, nên giữ nguyên bộ đang hiển thị.
        if (activeRef.current) setIsLoading(false)
        return { ok: false, error: describeFromBankError(error) }
      } finally {
        opLock.current = false
        if (activeRef.current) setIsReplacing(false)
      }
    },
    [sessionPublicId, applyQuestions],
  )

  return {
    questions,
    isLoading,
    loadError,
    isGenerating,
    generateError,
    regeneratingId,
    regenerateFailure,
    isSaving,
    isReplacing,
    /** Có thao tác ghi nào đang chạy; mọi nút xung đột phải khoá theo cờ này. */
    isBusy: isGenerating || regeneratingId !== null || isSaving || isReplacing,
    generate,
    regenerate,
    saveToBank,
    replaceFromBank,
    applyQuestions,
    reload,
  }
}
