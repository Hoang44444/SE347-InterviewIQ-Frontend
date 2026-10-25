import { Link } from 'react-router-dom'

import { ScoreValue } from './ScoreValue'

import { Button, Card, Spinner, Stack } from '@/components/ui'
import { MAX_SCORE } from '@/constants/history'
import type { InterviewSessionStatus } from '@/types/interview'
import type { SessionResult, SessionScore } from '@/types/scoring'
import { formatScore } from '@/utils/format'

/** Ba mặt điểm backend chấm, ngoài điểm tổng. */
type BreakdownKey = Extract<
  keyof SessionScore,
  'contentScore' | 'relevanceScore' | 'confidenceScore'
>

const BREAKDOWN: { label: string; key: BreakdownKey }[] = [
  { label: 'Nội dung', key: 'contentScore' },
  { label: 'Độ liên quan', key: 'relevanceScore' },
  { label: 'Sự tự tin', key: 'confidenceScore' },
]

/** Lời nhắc cho từng trạng thái chưa có kết quả. */
const PENDING_NOTICE: Record<InterviewSessionStatus, { title: string; description: string }> = {
  CREATED: {
    title: 'Buổi phỏng vấn chưa bắt đầu',
    description: 'Vào phòng để bắt đầu trả lời câu hỏi.',
  },
  IN_PROGRESS: {
    title: 'Buổi phỏng vấn đang diễn ra',
    description: 'Trả lời hết câu hỏi rồi nộp bài để được chấm điểm.',
  },
  SUBMITTED: {
    title: 'Đã nộp, đang chờ chấm điểm',
    description: 'Kết quả sẽ hiện ở đây ngay khi hệ thống chấm xong.',
  },
  SCORING: {
    title: 'Hệ thống đang chấm bài',
    description: 'Việc này thường mất vài phút. Bấm kiểm tra lại để xem đã xong chưa.',
  },
  COMPLETED: {
    title: 'Chưa lấy được điểm',
    description: 'Buổi đã hoàn thành nhưng hệ thống chưa trả về kết quả chấm.',
  },
  FAILED: {
    title: 'Chấm điểm thất bại',
    description: 'Câu trả lời của bạn vẫn được lưu. Hãy thử kiểm tra lại sau.',
  },
  CANCELLED: {
    title: 'Buổi phỏng vấn đã huỷ',
    description: 'Buổi bị huỷ nên không có điểm và nhận xét.',
  },
}

export interface HistoryResultPanelProps {
  status: InterviewSessionStatus
  result: SessionResult | null
  isLoading: boolean
  loadError: string
  onRetry: () => void
  /** Đường vào phòng phỏng vấn, cho buổi còn làm tiếp được. */
  roomTo: string
}

/**
 * Khối điểm và nhận xét của trang chi tiết.
 *
 * API lịch sử chừa sẵn hai field score/summary nhưng hiện luôn trả null, nên
 * trang gọi riêng endpoint của Scoring module và truyền kết quả vào đây. Khi
 * API lịch sử tự trả dữ liệu thì chỉ cần đổi nguồn của prop `result`.
 */
export function HistoryResultPanel({
  status,
  result,
  isLoading,
  loadError,
  onRetry,
  roomTo,
}: HistoryResultPanelProps) {
  return (
    <Card padding="lg">
      <Stack gap="lg">
        <h2 className="font-semibold text-content">Điểm và nhận xét</h2>

        {isLoading ? (
          <div role="status" aria-label="Đang tải kết quả" className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : result ? (
          <ResultBody result={result} />
        ) : loadError ? (
          <Stack gap="sm">
            <p
              role="alert"
              className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700"
            >
              Chưa tải được kết quả: {loadError}
            </p>
            <Button variant="secondary" className="self-start" onClick={onRetry}>
              Thử lại
            </Button>
          </Stack>
        ) : (
          <PendingNotice status={status} onRetry={onRetry} roomTo={roomTo} />
        )}
      </Stack>
    </Card>
  )
}

function ResultBody({ result }: { result: SessionResult }) {
  const { scores, summary } = result

  return (
    <Stack gap="lg">
      <ScoreValue score={scores.overallScore} size="lg" showBar />

      <Stack gap="sm">
        {BREAKDOWN.map(({ label, key }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <p className="text-sm text-content-muted">{label}</p>
            <p className="text-sm font-medium text-content tabular-nums">
              {formatScore(scores[key])}
              <span className="text-content-subtle">/{MAX_SCORE}</span>
            </p>
          </div>
        ))}
      </Stack>

      {summary.overallFeedback && (
        <p className="text-sm text-content-muted">{summary.overallFeedback}</p>
      )}

      {summary.strengths.length > 0 && (
        <Stack gap="sm">
          <h3 className="text-sm font-semibold text-content">Điểm mạnh</h3>
          {summary.strengths.map((strength, index) => (
            <div
              key={`${strength.category}-${index}`}
              className="rounded-card bg-success-50 p-(--space-sm)"
            >
              <p className="text-sm font-medium text-content">{strength.title}</p>
              <p className="mt-1 text-sm text-content-muted">{strength.description}</p>
            </div>
          ))}
        </Stack>
      )}

      {summary.improvements.length > 0 && (
        <Stack gap="sm">
          <h3 className="text-sm font-semibold text-content">Cần cải thiện</h3>
          {summary.improvements.map((improvement, index) => (
            <div
              key={`${improvement.category}-${index}`}
              className="rounded-card bg-warning-50 p-(--space-sm)"
            >
              <p className="text-sm font-medium text-content">{improvement.title}</p>
              <p className="mt-1 text-sm text-content-muted">{improvement.description}</p>
              {improvement.suggestion && (
                <p className="mt-1 text-sm text-content-muted">
                  <span aria-hidden>→ </span>
                  {improvement.suggestion}
                </p>
              )}
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

function PendingNotice({
  status,
  onRetry,
  roomTo,
}: {
  status: InterviewSessionStatus
  onRetry: () => void
  roomTo: string
}) {
  const notice = PENDING_NOTICE[status]
  const canEnterRoom = status === 'CREATED' || status === 'IN_PROGRESS'

  return (
    <Stack gap="sm">
      <p className="font-medium text-content">{notice.title}</p>
      <p className="text-sm text-content-muted">{notice.description}</p>
      {canEnterRoom ? (
        <Link
          to={roomTo}
          className="inline-flex h-10 items-center justify-center self-start rounded-control bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {status === 'CREATED' ? 'Vào phòng' : 'Tiếp tục'}
        </Link>
      ) : (
        status !== 'CANCELLED' && (
          <Button variant="secondary" className="self-start" onClick={onRetry}>
            Kiểm tra lại
          </Button>
        )
      )}
    </Stack>
  )
}
