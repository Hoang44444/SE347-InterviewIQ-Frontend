import { Badge } from '@/components/ui'
import { SPEECH_PACE_LABEL, SPEECH_PACE_TONE } from '@/constants/speech'
import type { PaceStatus, SpeechError, SpeechStatus } from '@/types/speech'

export interface SpeechFeedbackProps {
  status: SpeechStatus
  error: SpeechError | null
  pace: PaceStatus | null
  /** Số từ/phút gần đây; null khi chưa nghe đủ lâu. */
  wpm: number | null
}

/** Cho người trả lời biết lời có đang được chép không, và đang nói nhanh hay chậm. */
export function SpeechFeedback({ status, error, pace, wpm }: SpeechFeedbackProps) {
  if (status === 'unsupported')
    return (
      <p className="rounded-control bg-warning-50 px-4 py-3 text-sm text-warning-700">
        Trình duyệt này không chép lời tự động. Hãy gõ nội dung trả lời vào ô Ghi chú câu trả lời:
        đây là phần được dùng để chấm điểm.
      </p>
    )
  if (error)
    return (
      <p role="status" className="rounded-control bg-warning-50 px-4 py-3 text-sm text-warning-700">
        {error.message}
      </p>
    )
  if (status !== 'listening') return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-content-muted">
      <span>Đang chép lời</span>
      {pace && <Badge tone={SPEECH_PACE_TONE[pace]}>{SPEECH_PACE_LABEL[pace]}</Badge>}
      {wpm !== null && <span className="tabular-nums">{`${wpm} từ/phút`}</span>}
    </div>
  )
}
