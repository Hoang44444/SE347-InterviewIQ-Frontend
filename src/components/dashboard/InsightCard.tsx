import type { ReactNode } from 'react'

import { Badge, Button, Card, Spinner } from '@/components/ui'
import { FEEDBACK_CATEGORY_LABEL } from '@/constants/scoring'
import type { HistoryInsightState, InsightFeedbackItem } from '@/types/dashboard'
import { formatDateTime } from '@/utils/format'

export interface InsightCardProps {
  state: HistoryInsightState | null
  isLoading: boolean
  loadError: string
  onReload: () => void
  onRefresh: () => void
  isRefreshing: boolean
  refreshError: string
}

function FeedbackItems({
  title,
  items,
  tone,
}: {
  title: string
  items: InsightFeedbackItem[]
  tone: 'success' | 'warning'
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-content">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-content-subtle">Chưa có.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={`${item.category}-${item.title}`} className="flex flex-col gap-1">
              <Badge tone={tone} className="self-start">
                {FEEDBACK_CATEGORY_LABEL[item.category] ?? item.category}
              </Badge>
              <p className="text-sm font-medium text-content">{item.title}</p>
              <p className="text-sm text-content-muted">{item.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Nhận xét AI về toàn bộ quá trình luyện tập.
 *
 * Nút chỉ hiện khi bấm có ích: chưa có nhận xét, hoặc nhận xét đã cũ vì có buổi
 * mới. Bấm khi lịch sử không đổi thì backend cũng chỉ trả lại bản cũ.
 */
export function InsightCard({
  state,
  isLoading,
  loadError,
  onReload,
  onRefresh,
  isRefreshing,
  refreshError,
}: InsightCardProps) {
  const header = (action?: ReactNode) => (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold text-content">Nhận xét tổng hợp từ AI</h2>
        <p className="text-sm text-content-muted">
          Điểm mạnh, điểm yếu lặp lại và gợi ý cho buổi luyện tập tiếp theo.
        </p>
      </div>
      {action}
    </div>
  )

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4">
        {header()}
        <div className="flex justify-center py-6">
          <Spinner label="Đang tải nhận xét" />
        </div>
      </Card>
    )
  }

  if (loadError || !state) {
    return (
      <Card className="flex flex-col gap-4">
        {header()}
        <p className="text-sm text-danger-700">{loadError}</p>
        <Button variant="secondary" size="sm" className="self-start" onClick={onReload}>
          Thử lại
        </Button>
      </Card>
    )
  }

  const { insight } = state
  const canRefresh = state.canGenerate && (insight === null || state.isStale)
  const action = canRefresh ? (
    <Button size="sm" isLoading={isRefreshing} onClick={onRefresh}>
      {insight ? 'Cập nhật nhận xét' : 'Tạo nhận xét'}
    </Button>
  ) : undefined

  return (
    <Card className="flex flex-col gap-4">
      {header(action)}

      {refreshError && (
        <p role="alert" className="text-sm text-danger-700">
          {refreshError}
        </p>
      )}
      {isRefreshing && (
        <p className="text-sm text-content-muted">AI đang đọc lại lịch sử của bạn, chờ vài giây…</p>
      )}

      {!state.canGenerate && (
        <p className="text-sm text-content-muted">
          Cần ít nhất {state.minCompletedSessions} buổi đã chấm xong để AI tổng hợp nhận xét. Bạn
          đang có {state.completedSessions} buổi.
        </p>
      )}

      {state.canGenerate && !insight && !isRefreshing && (
        <p className="text-sm text-content-muted">
          Bạn đã có {state.completedSessions} buổi đã chấm. Bấm “Tạo nhận xét” để AI đọc toàn bộ
          lịch sử và chỉ ra điểm mạnh, điểm yếu.
        </p>
      )}

      {insight && (
        <>
          {state.isStale && (
            <Badge tone="info" className="self-start">
              Có buổi mới từ lần tạo trước
            </Badge>
          )}
          <p className="text-content">{insight.overallFeedback}</p>
          <div className="grid gap-6 md:grid-cols-3">
            <FeedbackItems title="Điểm mạnh" items={insight.strengths} tone="success" />
            <FeedbackItems title="Cần cải thiện" items={insight.weaknesses} tone="warning" />
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-content">Gợi ý</h3>
              {insight.recommendations.length === 0 ? (
                <p className="text-sm text-content-subtle">Chưa có.</p>
              ) : (
                <ol className="flex list-decimal flex-col gap-3 pl-4">
                  {insight.recommendations.map((item) => (
                    <li key={item.title}>
                      <p className="text-sm font-medium text-content">{item.title}</p>
                      <p className="text-sm text-content-muted">{item.description}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
          <p className="text-xs text-content-subtle">
            Dựa trên {insight.basedOnSessionCount} buổi · tạo lúc{' '}
            {formatDateTime(insight.generatedAt)}
          </p>
        </>
      )}
    </Card>
  )
}
