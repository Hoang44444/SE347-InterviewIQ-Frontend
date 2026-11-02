import { Link } from 'react-router-dom'

import { ScoreValue } from './ScoreValue'

import { Badge, Card } from '@/components/ui'
import { historyActionLabel, isResumable } from '@/constants/history'
import { SESSION_STATUS_LABEL, SESSION_STATUS_TONE } from '@/constants/interview'
import { ROUTES } from '@/routes/paths'
import type { InterviewHistoryItem } from '@/types/history'
import { formatDateTime, formatDurationLabel } from '@/utils/format'

export interface HistoryRowProps {
  item: InterviewHistoryItem
}

/**
 * Một buổi phỏng vấn trong danh sách lịch sử.
 *
 * Thẻ chiếm cả chiều rộng với lưới cột cố định thay vì lưới thẻ hai cột: lịch sử
 * là để so sánh các buổi với nhau, cột thẳng hàng thì quét mắt theo chiều dọc
 * được. Trên màn hẹp lưới tự xếp dọc nên không phải viết hai bản bố cục.
 *
 * Buổi còn làm tiếp được dẫn vào phòng phỏng vấn, buổi đã xong dẫn sang trang
 * chi tiết: hai đích đến khác nhau nên tiêu đề và nút luôn trỏ cùng một chỗ để
 * người dùng không phải đoán.
 */
export function HistoryRow({ item }: HistoryRowProps) {
  const target = isResumable(item.status)
    ? ROUTES.interviewRoom(item.id)
    : ROUTES.historyDetail(item.id)

  return (
    <Card>
      <div className="grid gap-3 md:grid-cols-[1fr_6rem_6rem_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 wrap-anywhere font-semibold text-content">
              <Link to={target} className="hover:underline focus-visible:outline-brand-600">
                {item.title || 'Buổi phỏng vấn'}
              </Link>
            </h2>
            <Badge tone={SESSION_STATUS_TONE[item.status]}>
              {SESSION_STATUS_LABEL[item.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-content-subtle">
            {item.totalQuestions} câu hỏi &middot; {formatDateTime(item.createdAt)}
          </p>
        </div>

        {/* Nhãn hiện ở cả hai khổ màn hình: thẻ không có dòng tiêu đề cột. */}
        <div>
          <p className="text-xs text-content-subtle">Điểm</p>
          <ScoreValue score={item.overallScore} showBar />
        </div>

        <div>
          <p className="text-xs text-content-subtle">Thời lượng</p>
          <p className="text-sm font-medium text-content tabular-nums">
            {formatDurationLabel(item.durationSeconds)}
          </p>
        </div>

        <Link
          to={target}
          className="inline-flex h-10 items-center justify-center rounded-control bg-surface px-4 text-sm font-medium text-content ring-1 ring-border-strong transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {historyActionLabel(item.status)}
        </Link>
      </div>
    </Card>
  )
}
