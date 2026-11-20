import { Badge, Stack } from '@/components/ui'
import { FEEDBACK_CATEGORY_LABEL } from '@/constants/scoring'
import type { SessionSummary } from '@/types/scoring'
import { formatDateTime } from '@/utils/format'

export interface FeedbackListProps {
  summary: SessionSummary
  scoredAt: string
}

export function FeedbackList({ summary, scoredAt }: FeedbackListProps) {
  return (
    <Stack gap="lg">
      {summary.overallFeedback && (
        <p className="text-sm text-content-muted">{summary.overallFeedback}</p>
      )}

      {summary.strengths.length > 0 && (
        <Stack gap="sm">
          <h3 className="text-sm font-semibold text-content">Điểm mạnh</h3>
          <ul className="flex flex-col gap-2">
            {summary.strengths.map((strength, index) => (
              <li
                key={`${strength.category}-${index}`}
                className="rounded-card bg-success-50 p-(--space-sm)"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">
                    {FEEDBACK_CATEGORY_LABEL[strength.category] ?? strength.category}
                  </Badge>
                  <p className="text-sm font-medium text-content">{strength.title}</p>
                </div>
                <p className="mt-1 text-sm text-content-muted">{strength.description}</p>
              </li>
            ))}
          </ul>
        </Stack>
      )}

      {summary.improvements.length > 0 && (
        <Stack gap="sm">
          <h3 className="text-sm font-semibold text-content">Cần cải thiện</h3>
          <ul className="flex flex-col gap-2">
            {summary.improvements.map((improvement, index) => (
              <li
                key={`${improvement.category}-${index}`}
                className="rounded-card bg-warning-50 p-(--space-sm)"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">
                    {FEEDBACK_CATEGORY_LABEL[improvement.category] ?? improvement.category}
                  </Badge>
                  <p className="text-sm font-medium text-content">{improvement.title}</p>
                </div>
                <p className="mt-1 text-sm text-content-muted">{improvement.description}</p>
                {improvement.suggestion && (
                  <p className="mt-1 text-sm text-content-muted">
                    <span aria-hidden>→ </span>
                    {improvement.suggestion}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Stack>
      )}

      <p className="text-xs text-content-subtle">
        {summary.scoringModel}
        {' · '}
        {summary.promptVersion ?? '—'}
        {' · '}
        {formatDateTime(scoredAt)}
      </p>
    </Stack>
  )
}
