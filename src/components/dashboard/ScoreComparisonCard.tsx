import { useId, useState } from 'react'

import { formatShortDate } from './chartSeries'
import { ScoreRadarChart, type RadarSeries } from './ScoreRadarChart'

import { Badge, Card, Select, type SelectOption } from '@/components/ui'
import { SCORE_CRITERIA } from '@/constants/scoring'
import type { InterviewStats, InterviewStatsScores } from '@/types/dashboard'
import { formatScore } from '@/utils/format'

/** Giá trị của option "trung bình" trong ô chọn mốc so sánh. */
const AVERAGE = 'average'

function formatDelta(value: number): string {
  return value > 0 ? `+${formatScore(value)}` : formatScore(value)
}

function deltaTone(value: number): 'success' | 'danger' | 'neutral' {
  if (value > 0) return 'success'
  if (value < 0) return 'danger'
  return 'neutral'
}

const DELTA_ROWS: { key: keyof InterviewStatsScores; label: string }[] = [
  { key: 'overallScore', label: 'Điểm tổng' },
  ...SCORE_CRITERIA.map((criterion) => ({ key: criterion.key, label: criterion.shortLabel })),
]

export interface ScoreComparisonCardProps {
  /** Đã có ít nhất một buổi: comparison và averages khác null. */
  stats: InterviewStats
}

/**
 * Radar so buổi mới nhất với một mốc người dùng chọn (mặc định là trung bình),
 * kèm chênh lệch từng tiêu chí so với buổi liền trước.
 */
export function ScoreComparisonCard({ stats }: ScoreComparisonCardProps) {
  const selectId = useId()
  const [baselineId, setBaselineId] = useState(AVERAGE)

  const comparison = stats.comparison
  if (!comparison || !stats.averages) return null
  const { latest, previous, delta } = comparison

  // Mốc so sánh lấy từ chính trend, nên chỉ chọn được các buổi đang vẽ trên
  // biểu đồ đường; buổi mới nhất không tự so với chính nó.
  const candidates = stats.trend.filter((session) => session.id !== latest.id).reverse()
  const options: SelectOption[] = [
    { value: AVERAGE, label: 'Trung bình các buổi' },
    ...candidates.map((session) => ({
      value: session.id,
      label: `${formatShortDate(session.createdAt)} · ${session.title}`,
    })),
  ]
  const baselineSession = candidates.find((session) => session.id === baselineId)
  const baseline: RadarSeries = baselineSession
    ? {
        label: `Buổi ${formatShortDate(baselineSession.createdAt)}`,
        scores: baselineSession,
        tone: 'baseline',
      }
    : { label: 'Trung bình', scores: stats.averages, tone: 'baseline' }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-content">So sánh theo tiêu chí</h2>
        <p className="text-sm text-content-muted">Buổi gần nhất: {latest.title}</p>
      </div>

      <Select
        id={selectId}
        label="So với"
        options={options}
        value={baselineSession ? baselineSession.id : AVERAGE}
        onChange={(event) => setBaselineId(event.target.value)}
      />

      <ScoreRadarChart
        maxScore={stats.maxScore}
        series={[baseline, { label: 'Buổi gần nhất', scores: latest, tone: 'primary' }]}
      />

      <div>
        <h3 className="text-sm font-medium text-content">So với buổi liền trước</h3>
        {previous && delta ? (
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {DELTA_ROWS.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-2">
                <span className="text-content-muted">{row.label}</span>
                <Badge tone={deltaTone(delta[row.key])}>{formatDelta(delta[row.key])}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-content-subtle">
            Cần thêm một buổi nữa để so với lần trước.
          </p>
        )}
      </div>
    </Card>
  )
}
