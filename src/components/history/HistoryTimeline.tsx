import type { InterviewHistoryDetail } from '@/types/history'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'

export interface HistoryTimelineProps {
  detail: InterviewHistoryDetail
}

/**
 * Bốn mốc thời gian của một buổi phỏng vấn.
 *
 * Mốc nào backend trả null thì hiện xám và không có giờ. Nhờ vậy cùng một khối
 * này kể đúng câu chuyện cho cả bảy trạng thái mà không cần nhánh riêng cho
 * từng trạng thái.
 */
export function HistoryTimeline({ detail }: HistoryTimelineProps) {
  const steps = [
    { label: 'Tạo buổi', at: detail.createdAt },
    { label: 'Bắt đầu', at: detail.startedAt },
    { label: 'Nộp bài', at: detail.submittedAt },
    { label: 'Chấm xong', at: detail.completedAt },
  ]

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              'size-2 shrink-0 rounded-full',
              step.at ? 'bg-brand-600' : 'bg-border-strong',
            )}
          />
          <p className={cn('flex-1 text-sm', step.at ? 'text-content' : 'text-content-subtle')}>
            {step.label}
          </p>
          <p
            className={cn(
              'text-sm tabular-nums',
              step.at ? 'text-content-muted' : 'text-content-subtle',
            )}
          >
            {formatDateTime(step.at)}
          </p>
        </li>
      ))}
    </ol>
  )
}
