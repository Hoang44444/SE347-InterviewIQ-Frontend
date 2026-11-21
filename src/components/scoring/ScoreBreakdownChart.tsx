import { MAX_SCORE, scoreTone, type ScoreTone } from '@/constants/history'
import { SCORE_CRITERIA } from '@/constants/scoring'
import type { SessionScore } from '@/types/scoring'
import { cn } from '@/utils/cn'
import { formatScore } from '@/utils/format'

const TEXT_CLASS: Record<ScoreTone, string> = {
  success: 'text-success-700',
  warning: 'text-warning-700',
  danger: 'text-danger-700',
}

const BAR_CLASS: Record<ScoreTone, string> = {
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  danger: 'bg-danger-600',
}

const CENTER_X = 130
const CENTER_Y = 108
const MAX_RADIUS = 64
const GRID_LEVELS = [0.25, 0.5, 0.75, 1] as const
const AXES = [
  { angleDeg: -90, labelX: 130, labelY: 28, anchor: 'middle' as const },
  { angleDeg: 30, labelX: 192, labelY: 152, anchor: 'start' as const },
  { angleDeg: 150, labelX: 68, labelY: 152, anchor: 'end' as const },
] as const

function polarPoint(angleDeg: number, ratio: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  const r = MAX_RADIUS * ratio
  return [
    Number((CENTER_X + r * Math.cos(rad)).toFixed(2)),
    Number((CENTER_Y + r * Math.sin(rad)).toFixed(2)),
  ]
}

function toPoints(coords: readonly [number, number][]): string {
  return coords.map(([x, y]) => `${x},${y}`).join(' ')
}

export interface ScoreBreakdownChartProps {
  scores: SessionScore
}

/**
 * Biểu đồ 3 trụ cột chấm điểm: radar tam giác SVG kết hợp 3 thanh ngang.
 * Thanh ngang là nguồn thông tin chính cho trình đọc màn hình; SVG bổ sung tóm tắt qua aria-label.
 */
export function ScoreBreakdownChart({ scores }: ScoreBreakdownChartProps) {
  const values = SCORE_CRITERIA.map((criterion) => ({
    ...criterion,
    value: scores[criterion.key],
    ratio: Math.min(1, Math.max(0, scores[criterion.key] / MAX_SCORE)),
  }))

  const dataPoints = values.map((item, idx) => polarPoint(AXES[idx].angleDeg, item.ratio))
  const ariaSummary = `Biểu đồ 3 tiêu chí: ${values
    .map((item) => `${item.label} ${formatScore(item.value)}/${MAX_SCORE}`)
    .join(', ')}`

  return (
    <div className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-center">
      <div className="flex justify-center">
        <svg
          role="img"
          aria-label={ariaSummary}
          viewBox="0 0 260 180"
          className="h-44 w-64 max-w-full"
        >
          {GRID_LEVELS.map((level) => (
            <polygon
              key={level}
              points={toPoints(AXES.map((axis) => polarPoint(axis.angleDeg, level)))}
              className="fill-none stroke-border [stroke-width:1]"
            />
          ))}

          {AXES.map((axis) => {
            const [x, y] = polarPoint(axis.angleDeg, 1)
            return (
              <line
                key={axis.angleDeg}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={x}
                y2={y}
                className="stroke-border [stroke-width:1]"
              />
            )
          })}

          <polygon
            points={toPoints(dataPoints)}
            className="fill-brand-100 stroke-brand-600 [stroke-width:2]"
          />

          {dataPoints.map(([x, y], idx) => (
            <circle key={values[idx].key} cx={x} cy={y} r={3.5} className="fill-brand-600" />
          ))}

          {AXES.map((axis, idx) => (
            <text
              key={values[idx].key}
              x={axis.labelX}
              y={axis.labelY}
              textAnchor={axis.anchor}
              className="fill-content-muted text-xs font-medium"
            >
              {values[idx].shortLabel}
            </text>
          ))}
        </svg>
      </div>

      <ul className="flex flex-col gap-3">
        {values.map((item) => {
          const tone = scoreTone(item.value)
          const percent = Math.round(item.ratio * 100)
          return (
            <li key={item.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-content">
                  {item.label}{' '}
                  <span className="text-xs text-content-subtle">({item.weightLabel})</span>
                </p>
                <p className={cn('text-sm font-semibold tabular-nums', TEXT_CLASS[tone])}>
                  {formatScore(item.value)}
                  <span className="font-normal text-content-subtle">/{MAX_SCORE}</span>
                </p>
              </div>
              <div
                aria-hidden
                className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
              >
                <div
                  className={cn('h-full rounded-full', BAR_CLASS[tone])}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
