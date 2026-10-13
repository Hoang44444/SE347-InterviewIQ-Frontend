import { useEffect, useRef, useState } from 'react'

import type { ApiError } from '@/types/api'
import type {
  Answer,
  InterviewRoomService,
  InterviewSessionTiming,
  SubmitInterviewSessionPayload,
  SubmitInterviewSessionResult,
} from '@/types/interview'
import type { createInterviewClock } from '@/utils/interviewClock'

interface SubmissionEligibility {
  cvPublicId?: string
  questionIds: string[]
  savedAnswers: Record<string, Answer>
  isPending: boolean
}

export function useSessionSubmission(
  id: string,
  service: InterviewRoomService,
  clock: ReturnType<typeof createInterviewClock>,
) {
  const [timing, setTiming] = useState<InterviewSessionTiming | null>(null)
  const [submission, setSubmission] = useState<SubmitInterviewSessionResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [canRetry, setCanRetry] = useState(false)
  const activeRef = useRef(false)
  const pendingRef = useRef(false)
  const completedRef = useRef(false)
  const blockedRef = useRef(false)
  const payloadRef = useRef<SubmitInterviewSessionPayload | null>(null)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  async function submit(
    input: SubmissionEligibility,
    prepare?: () => Promise<void>,
  ): Promise<SubmitInterviewSessionResult | null> {
    if (
      !activeRef.current ||
      pendingRef.current ||
      completedRef.current ||
      blockedRef.current ||
      input.isPending
    )
      return null
    if (!payloadRef.current) {
      if (
        !input.cvPublicId ||
        input.questionIds.length === 0 ||
        !input.questionIds.every((questionId) => input.savedAnswers[questionId])
      )
        return null
      const frozenTiming = clock.finish()
      payloadRef.current = Object.freeze({
        cvPublicId: input.cvPublicId,
        totalQuestions: input.questionIds.length,
        durationSeconds: frozenTiming.durationSeconds,
      })
      setTiming(frozenTiming)
    }
    pendingRef.current = true
    setIsSubmitting(true)
    setCanRetry(false)
    setError('')
    try {
      await prepare?.()
      if (!activeRef.current) return null
      const result = await service.finishSession(id, payloadRef.current)
      if (!activeRef.current) return null
      completedRef.current = true
      setSubmission(result)
      return result
    } catch (cause) {
      if (!activeRef.current) return null
      const status = (cause as ApiError).status ?? 0
      const retryable = status === 0 || status >= 500
      blockedRef.current = !retryable
      setCanRetry(retryable)
      setError(
        status === 409
          ? 'Nộp session bị xung đột. Có thể đã có job đang chấm hoặc session đã đóng; API không trả mã job hiện có.'
          : status === 404
            ? 'Không tìm thấy session hoặc CV thuộc tài khoản của bạn. Không thể nộp session.'
            : (cause as Error).message || 'Không nộp được session. Hãy thử lại.',
      )
      // Server có thể đã persist SUBMITTED trước khi enqueue thất bại: không mở lại answer/clock.
      return null
    } finally {
      pendingRef.current = false
      if (activeRef.current) setIsSubmitting(false)
    }
  }

  return { timing, submission, isSubmitting, error, canRetry, submit }
}
