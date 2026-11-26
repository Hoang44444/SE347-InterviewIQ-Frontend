import { Badge, Button, Card, Spinner, Stack } from '@/components/ui'
import { DIFFICULTY_LABEL, DIFFICULTY_TONE, DOMAIN_LABEL, DOMAIN_TONE } from '@/constants/interview'
import type { InterviewHistoryAnswer, InterviewHistoryQuestion } from '@/types/history'
import type { InterviewSessionStatus } from '@/types/interview'
import { formatDurationLabel } from '@/utils/format'

/** Trạng thái nào thì chưa thể có câu trả lời nào cả. */
const UNANSWERED_STATUSES: readonly InterviewSessionStatus[] = ['CREATED', 'IN_PROGRESS']

/** Trạng thái đang chờ hệ thống chấm: có bản ghi nhưng chưa có điểm. */
const SCORING_STATUSES: readonly InterviewSessionStatus[] = ['SUBMITTED', 'SCORING']

export interface HistoryQuestionPanelProps {
  status: InterviewSessionStatus
  questions: InterviewHistoryQuestion[]
  isLoading: boolean
  loadError: string
  /** Nguồn dữ liệu hiện tại không kèm video và transcript. */
  isAnswerless: boolean
  onRetry: () => void
}

/**
 * Danh sách câu hỏi của buổi, mỗi câu mở ra video, transcript và thời lượng.
 *
 * Dùng `<details>` của trình duyệt chứ không dựng accordion riêng: bàn phím,
 * trình đọc màn hình và Ctrl+F của trình duyệt chạy đúng mà không cần thêm
 * state nào. Câu đầu mở sẵn để màn hình không chỉ là một chồng thanh đóng.
 */
export function HistoryQuestionPanel({
  status,
  questions,
  isLoading,
  loadError,
  isAnswerless,
  onRetry,
}: HistoryQuestionPanelProps) {
  const isScoring = SCORING_STATUSES.includes(status)

  return (
    <Card padding="lg">
      <Stack gap="md">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-content">Câu hỏi và câu trả lời</h2>
          {questions.length > 0 && <Badge tone="neutral">{questions.length} câu</Badge>}
        </div>

        {isLoading ? (
          <div role="status" aria-label="Đang tải câu hỏi" className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : loadError ? (
          <Stack gap="sm">
            <p
              role="alert"
              className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700"
            >
              Chưa tải được danh sách câu hỏi: {loadError}
            </p>
            <Button variant="secondary" className="self-start" onClick={onRetry}>
              Thử lại
            </Button>
          </Stack>
        ) : questions.length === 0 ? (
          <p className="text-sm text-content-muted">
            {UNANSWERED_STATUSES.includes(status)
              ? 'Buổi này chưa có câu hỏi nào được sinh.'
              : 'Không đọc được danh sách câu hỏi của buổi này.'}
          </p>
        ) : (
          <>
            {isScoring && (
              <p className="text-sm text-content-muted">
                Hệ thống đang chấm bài. Video và transcript đã lưu hiện ngay bên dưới; điểm và nhận
                xét sẽ xuất hiện ở khối trên khi chấm xong.
              </p>
            )}

            <ol className="flex flex-col gap-3">
              {questions.map((question, index) => (
                <li key={question.id}>
                  <QuestionItem
                    question={question}
                    number={index + 1}
                    status={status}
                    isAnswerless={isAnswerless}
                    defaultOpen={index === 0}
                  />
                </li>
              ))}
            </ol>
          </>
        )}
      </Stack>
    </Card>
  )
}

function QuestionItem({
  question,
  number,
  status,
  isAnswerless,
  defaultOpen,
}: {
  question: InterviewHistoryQuestion
  number: number
  status: InterviewSessionStatus
  isAnswerless: boolean
  defaultOpen: boolean
}) {
  const { answer } = question

  return (
    <details open={defaultOpen} className="group rounded-control border border-border bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="text-content-subtle transition group-open:rotate-90 motion-reduce:transition-none"
        >
          &rsaquo;
        </span>
        <span className="text-sm font-medium text-content">Câu {number}</span>

        {question.domain && (
          <Badge tone={DOMAIN_TONE[question.domain]}>{DOMAIN_LABEL[question.domain]}</Badge>
        )}
        {question.difficulty && (
          <Badge tone={DIFFICULTY_TONE[question.difficulty]}>
            {DIFFICULTY_LABEL[question.difficulty]}
          </Badge>
        )}

        {answer === null ? (
          <Badge tone="neutral">Chưa có câu trả lời</Badge>
        ) : (
          answer.durationSeconds !== null && (
            <span className="text-xs text-content-subtle tabular-nums">
              {formatDurationLabel(answer.durationSeconds)}
            </span>
          )
        )}
      </summary>

      <div className="border-t border-border px-4 py-4">
        <Stack gap="md">
          <p className="text-sm whitespace-pre-line text-content wrap-anywhere">
            {question.content}
          </p>

          {answer === null ? (
            <p className="text-sm text-content-muted">
              {UNANSWERED_STATUSES.includes(status)
                ? 'Bạn chưa trả lời câu này.'
                : isAnswerless
                  ? 'Chưa đọc được video và transcript của câu này.'
                  : 'Câu này không có bản ghi trả lời.'}
            </p>
          ) : (
            <AnswerBody answer={answer} number={number} />
          )}
        </Stack>
      </div>
    </details>
  )
}

function AnswerBody({ answer, number }: { answer: InterviewHistoryAnswer; number: number }) {
  // transcript null là response không kèm phần transcript, chuỗi rỗng là câu
  // trả lời không có lời: màn hình nói như nhau cho cả hai trường hợp.
  const transcript = answer.transcript ?? ''

  return (
    <Stack gap="md">
      {answer.videoUrl === null ? (
        <p className="text-sm text-content-muted">
          Video của câu này không còn khả dụng, chỉ còn lại transcript.
        </p>
      ) : (
        <video
          controls
          playsInline
          preload="metadata"
          src={answer.videoUrl}
          aria-label={`Video câu trả lời ${number}`}
          className="aspect-video w-full rounded-control bg-surface-sunken"
        />
      )}

      <Stack gap="sm">
        <h3 className="text-sm font-semibold text-content">Transcript</h3>
        {transcript.trim() === '' ? (
          <p className="text-sm text-content-subtle">Câu trả lời này không có transcript.</p>
        ) : (
          <p className="text-sm whitespace-pre-line text-content-muted wrap-anywhere">
            {transcript}
          </p>
        )}
      </Stack>
    </Stack>
  )
}
