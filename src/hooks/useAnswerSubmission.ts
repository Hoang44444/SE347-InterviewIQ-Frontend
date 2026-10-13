import { useEffect, useRef, useState } from 'react'

import { validateInterviewVideo } from '@/services/interviewVideoUpload'
import type { ApiError } from '@/types/api'
import type { Answer, InterviewRoomService } from '@/types/interview'
import type { InterviewRecording } from '@/types/recording'

export type AnswerSubmissionPhase = 'idle' | 'uploading' | 'saving'

export function useAnswerSubmission(id: string, service: InterviewRoomService) {
  const [phase, setPhase] = useState<AnswerSubmissionPhase>('idle')
  const [savedAnswers, setSavedAnswers] = useState<Record<string, Answer>>({})
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState('')
  const activeRef = useRef(false)
  const pendingRef = useRef(false)
  const blockedRef = useRef(false)
  const savedRef = useRef<Record<string, Answer>>({})
  const assetsRef = useRef(new Map<string, { blob: Blob; publicId: string }>())

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  async function save(
    questionId: string,
    transcript: string,
    recording?: InterviewRecording,
  ): Promise<Answer | null> {
    if (
      !activeRef.current ||
      pendingRef.current ||
      blockedRef.current ||
      savedRef.current[questionId]
    )
      return null
    pendingRef.current = true
    setError('')
    try {
      if (!recording || recording.questionId !== questionId)
        throw new Error('Hãy ghi video cho câu này trước khi nộp.')
      validateInterviewVideo(recording.blob)
      if (transcript.length > 50000) throw new Error('Transcript không được vượt quá 50.000 ký tự.')
      let asset = assetsRef.current.get(questionId)
      if (asset?.blob !== recording.blob) {
        // Chỉ Blob mới hoàn tất mới thay thế cache; chỉnh transcript không đổi asset.
        assetsRef.current.delete(questionId)
        setPhase('uploading')
        const params = await service.getAnswerSignedParams(id, questionId)
        if (!activeRef.current) return null
        const publicId = await service.uploadAnswerVideo(params, recording)
        if (!activeRef.current) return null
        asset = { blob: recording.blob, publicId }
        assetsRef.current.set(questionId, asset)
      }
      setPhase('saving')
      const answer = await service.submitAnswer(id, questionId, {
        cloudinaryPublicId: asset.publicId,
        transcript,
      })
      if (!activeRef.current) return null
      savedRef.current = { ...savedRef.current, [questionId]: answer }
      setSavedAnswers(savedRef.current)
      return answer
    } catch (cause) {
      if (!activeRef.current) return null
      const status = (cause as ApiError).status
      const isBlocked = status === 404 || status === 409
      blockedRef.current = isBlocked
      setBlocked(isBlocked)
      setError(
        status === 404
          ? 'Không tìm thấy câu hỏi hoặc bạn không còn quyền truy cập phòng. Không thể tiếp tục nộp.'
          : status === 409
            ? 'Session đã đóng hoặc đã nộp. Không thể lưu thêm câu trả lời.'
            : (cause as Error).message || 'Không lưu được câu trả lời. Hãy thử lại.',
      )
      throw cause
    } finally {
      pendingRef.current = false
      if (activeRef.current) setPhase('idle')
    }
  }

  return { phase, savedAnswers, blocked, error, save }
}
