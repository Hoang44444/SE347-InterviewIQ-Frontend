import { useEffect, useEffectEvent, useRef } from 'react'

import { useSpeechTranscript } from '@/hooks/useSpeechTranscript'
import type { InterviewRecorderStatus, InterviewRecording } from '@/types/recording'
import { appendFinalSegment } from '@/utils/speechRate'

export interface UseAnswerTranscriptionOptions {
  recorderStatus: InterviewRecorderStatus
  recordings: Record<string, InterviewRecording>
  /** Câu đang mở; lần ghi mới được gắn với câu này. */
  questionId?: string
  /** Nội dung đang có trong ô trả lời của câu đang mở. */
  text: string
  onChange: (questionId: string, text: string) => void
}

/** Một lần ghi hình và phần lời của nó. */
interface Take {
  questionId: string
  /** Phần người dùng tự gõ, đứng trước lời được chép. */
  base: string
  /** Nội dung ô ngay trước lần ghi này, để trả lại nếu ghi lại bị hỏng. */
  textBefore: string
  recordingBefore?: InterviewRecording
}

/**
 * Chép lời vào ô trả lời theo nhịp của máy ghi hình: bắt đầu ghi thì nghe, dừng ghi
 * thì thôi. Lời đi cùng bản ghi nên ghi lại thì thay lời của bản cũ (kể cả chỗ đã sửa),
 * còn phần gõ từ trước lần ghi đầu được giữ.
 */
export function useAnswerTranscription({
  recorderStatus,
  recordings,
  questionId,
  text,
  onChange,
}: UseAnswerTranscriptionOptions) {
  const { status, error, pace, currentWpm, transcript, start, stop, reset } = useSpeechTranscript()
  const takeRef = useRef<Take | null>(null)
  /** Phần gõ tay của những câu đã có lời chép, dùng lại khi ghi lại. */
  const basesRef = useRef(new Map<string, string>())

  /** Thôi gắn lời vào ô trả lời: kết quả đến muộn sẽ bị bỏ. */
  function release() {
    takeRef.current = null
    reset()
  }

  const followRecorder = useEffectEvent((next: InterviewRecorderStatus) => {
    if (next === 'recording') {
      if (!questionId) return
      const base = basesRef.current.get(questionId) ?? text
      takeRef.current = {
        questionId,
        base,
        textBefore: text,
        recordingBefore: recordings[questionId],
      }
      if (base !== text) onChange(questionId, base)
      reset()
      start()
      return
    }
    stop()
    const take = takeRef.current
    // 'stopping' thì chưa biết bản ghi mới có thành công không.
    if (next === 'stopping' || !take?.recordingBefore) return
    // Ghi lại bị hỏng: bản ghi cũ được giữ thì lời của nó cũng phải được giữ.
    if (recordings[take.questionId] === take.recordingBefore) {
      release()
      onChange(take.questionId, take.textBefore)
    }
  })

  const writeTranscript = useEffectEvent((spoken: string) => {
    const take = takeRef.current
    if (!take || !spoken) return
    basesRef.current.set(take.questionId, take.base)
    onChange(take.questionId, appendFinalSegment(take.base, spoken).text)
  })

  useEffect(() => {
    followRecorder(recorderStatus)
  }, [recorderStatus])

  useEffect(() => {
    writeTranscript(transcript)
  }, [transcript])

  return { status, error, pace, wpm: currentWpm, isListening: status === 'listening', release }
}
