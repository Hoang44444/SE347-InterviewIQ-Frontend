import { Badge, Card, Stack } from '@/components/ui'
import { CHEAT_EVENT_LABEL } from '@/constants/integrity'
import type { CheatLog, CheatSummary } from '@/types/cheat'
import { formatDateTime } from '@/utils/format'

export interface CheatLogPanelProps {
  summary: CheatSummary
  logs: CheatLog[]
}

/**
 * Nhật ký tín hiệu bất thường của buổi. Chỉ để tham khảo: occurredAt là giờ phía
 * client, và buổi bị gắn cờ không bị trừ điểm hay đổi trạng thái.
 */
export function CheatLogPanel({ summary, logs }: CheatLogPanelProps) {
  return (
    <Card padding="lg">
      <Stack gap="md">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-content">Cảnh báo trong buổi</h2>
          {summary.totalCount > 0 && <Badge tone="warning">{summary.totalCount} lần</Badge>}
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-content-muted">Không ghi nhận tín hiệu bất thường nào.</p>
        ) : (
          <>
            <p className="text-sm text-content-muted">
              Chỉ để tham khảo, không ảnh hưởng điểm và nhận xét.
            </p>
            <ul className="flex flex-col gap-2">
              {logs.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0 text-content wrap-anywhere">
                    {CHEAT_EVENT_LABEL[log.eventType]}
                  </span>
                  <time
                    dateTime={log.occurredAt}
                    className="shrink-0 text-content-subtle tabular-nums"
                  >
                    {formatDateTime(log.occurredAt)}
                  </time>
                </li>
              ))}
            </ul>
          </>
        )}
      </Stack>
    </Card>
  )
}
