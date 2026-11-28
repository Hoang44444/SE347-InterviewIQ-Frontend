import { useId, useState } from 'react'

import { SCORE_SERIES, clampScore, formatShortDate, type ScoreKey } from './chartSeries'

import type { InterviewStatsSession } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import { formatScore } from '@/utils/format'

// SVG co giãn theo bề rộng card, chữ co theo. Khung hẹp (480) để trên điện thoại
// nhãn trục vẫn đọc được; trên desktop biểu đồ chỉ to ra chứ không vỡ.
const WIDTH = 480
const HEIGHT = 240
const PAD = { top: 16, right: 20, bottom: 36, left: 36 } as const
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom
/** Nhiều điểm hơn thì chỉ ghi ngày ở đầu, giữa và cuối để nhãn không đè nhau. */
const MAX_LABELED_POINTS = 8

export interface ScoreTrendChartProps {
  /** Cũ nhất trước, đúng thứ tự backend trả về. */
  points: InterviewStatsSession[]
  maxScore: number
}

/**
 * Biểu đồ đường điểm theo từng buổi. Trục x chia đều theo thứ tự buổi chứ không
 * theo thời gian thật: các buổi luyện tập cách nhau không đều, chia theo ngày thì
 * mấy buổi cùng tuần dồn cục lại một chỗ.
 */
export function ScoreTrendChart({ points, maxScore }: ScoreTrendChartProps) {
  const titleId = useId()
  const [hidden, setHidden] = useState<ReadonlySet<ScoreKey>>(new Set())

  const count = points.length
  const x = (index: number) =>
    PAD.left + (count === 1 ? PLOT_W / 2 : (index / (count - 1)) * PLOT_W)
  const y = (score: number) => PAD.top + PLOT_H - (clampScore(score, maxScore) / maxScore) * PLOT_H

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * maxScore)
  const labeled = (index: number) =>
    count <= MAX_LABELED_POINTS ||
    index === 0 ||
    index === count - 1 ||
    index === Math.floor((count - 1) / 2)

  function toggle(key: ScoreKey) {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      // Luôn chừa ít nhất một đường, biểu đồ trống không nói được gì.
      else if (next.size < SCORE_SERIES.length - 1) next.add(key)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{`Xu hướng điểm của ${count} buổi gần nhất`}</title>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-border"
              strokeDasharray={tick === 0 ? undefined : '4 4'}
            />
            <text
              x={PAD.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-content-subtle text-xs"
            >
              {formatScore(tick)}
            </text>
          </g>
        ))}

        {points.map((point, index) =>
          labeled(index) ? (
            <text
              key={point.id}
              x={x(index)}
              y={HEIGHT - PAD.bottom + 20}
              textAnchor="middle"
              className="fill-content-subtle text-xs"
            >
              {formatShortDate(point.createdAt)}
            </text>
          ) : null,
        )}

        {SCORE_SERIES.filter((series) => !hidden.has(series.key)).map((series) => (
          <g key={series.key} data-series={series.key}>
            {count > 1 && (
              <polyline
                points={points
                  .map((point, index) => `${x(index)},${y(point[series.key])}`)
                  .join(' ')}
                className={cn('fill-none', series.strokeClass)}
                strokeWidth={series.key === 'overallScore' ? 3 : 1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {points.map((point, index) => (
              <circle
                key={point.id}
                cx={x(index)}
                cy={y(point[series.key])}
                r={series.key === 'overallScore' ? 4.5 : 3}
                className={series.fillClass}
              >
                <title>{`${point.title} (${formatShortDate(point.createdAt)}): ${series.label} ${formatScore(point[series.key])}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap gap-2" aria-label="Chọn đường hiển thị">
        {SCORE_SERIES.map((series) => {
          const isVisible = !hidden.has(series.key)
          return (
            <button
              key={series.key}
              type="button"
              aria-pressed={isVisible}
              onClick={() => toggle(series.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-border transition',
                isVisible ? 'text-content' : 'text-content-subtle opacity-60',
              )}
            >
              <span aria-hidden className={cn('size-2.5 rounded-full', series.swatchClass)} />
              {series.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
