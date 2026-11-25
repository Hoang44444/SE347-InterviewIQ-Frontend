import { useId } from 'react'

import { clampScore } from './chartSeries'

import { SCORE_CRITERIA } from '@/constants/scoring'
import type { InterviewStatsScores } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import { formatScore } from '@/utils/format'

const WIDTH = 320
const HEIGHT = 290
const CENTER = { x: WIDTH / 2, y: 150 } as const
const RADIUS = 100
const LABEL_OFFSET = 22
const GRID_LEVELS = [0.25, 0.5, 0.75, 1]

export interface RadarSeries {
  label: string
  scores: InterviewStatsScores
  /** primary: nét liền tô màu thương hiệu; baseline: nét đứt màu trung tính. */
  tone: 'primary' | 'baseline'
}

const TONE_CLASS = {
  primary: {
    polygon: 'fill-brand-600/20 stroke-brand-600',
    dot: 'fill-brand-600',
    swatch: 'bg-brand-600',
  },
  baseline: {
    polygon: 'fill-content-subtle/10 stroke-content-subtle',
    dot: 'fill-content-subtle',
    swatch: 'bg-content-subtle',
  },
} as const

/** Trục thứ k bắt đầu từ đỉnh trên rồi đi theo chiều kim đồng hồ. */
function axisPoint(index: number, ratio: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / SCORE_CRITERIA.length
  return {
    x: CENTER.x + Math.cos(angle) * RADIUS * ratio,
    y: CENTER.y + Math.sin(angle) * RADIUS * ratio,
  }
}

function toPoints(ratios: number[]): string {
  return ratios
    .map((ratio, index) => {
      const point = axisPoint(index, ratio)
      return `${point.x},${point.y}`
    })
    .join(' ')
}

function anchorOf(x: number): 'start' | 'middle' | 'end' {
  if (Math.abs(x - CENTER.x) < 1) return 'middle'
  return x > CENTER.x ? 'start' : 'end'
}

export interface ScoreRadarChartProps {
  series: RadarSeries[]
  maxScore: number
}

/**
 * Radar theo ba tiêu chí chấm điểm. Chỉ có ba trục vì backend chỉ chấm ba tiêu
 * chí cấp buổi; điểm tổng không thành một trục vì nó là trung bình có trọng số
 * của chính ba trục kia.
 */
export function ScoreRadarChart({ series, maxScore }: ScoreRadarChartProps) {
  const titleId = useId()
  const description = series
    .map(
      (item) =>
        `${item.label}: ${SCORE_CRITERIA.map(
          (criterion) => `${criterion.shortLabel} ${formatScore(item.scores[criterion.key])}`,
        ).join(', ')}`,
    )
    .join('. ')

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto h-auto w-full max-w-sm"
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{`So sánh theo tiêu chí. ${description}`}</title>

        {GRID_LEVELS.map((level) => (
          <polygon
            key={level}
            points={toPoints(SCORE_CRITERIA.map(() => level))}
            className="fill-none stroke-border"
          />
        ))}
        {SCORE_CRITERIA.map((criterion, index) => {
          const end = axisPoint(index, 1)
          const label = axisPoint(index, 1 + LABEL_OFFSET / RADIUS)
          return (
            <g key={criterion.key}>
              <line x1={CENTER.x} y1={CENTER.y} x2={end.x} y2={end.y} className="stroke-border" />
              <text
                x={label.x}
                y={label.y}
                textAnchor={anchorOf(label.x)}
                dominantBaseline="middle"
                className="fill-content-muted text-xs font-medium"
              >
                {criterion.shortLabel}
              </text>
            </g>
          )
        })}

        {series.map((item) => {
          const ratios = SCORE_CRITERIA.map(
            (criterion) => clampScore(item.scores[criterion.key], maxScore) / maxScore,
          )
          const tone = TONE_CLASS[item.tone]
          return (
            <g key={item.label} data-series={item.tone}>
              <polygon
                points={toPoints(ratios)}
                className={tone.polygon}
                strokeWidth={2}
                strokeDasharray={item.tone === 'baseline' ? '5 4' : undefined}
                strokeLinejoin="round"
              />
              {ratios.map((ratio, index) => {
                const point = axisPoint(index, ratio)
                const criterion = SCORE_CRITERIA[index]
                return (
                  <circle
                    key={criterion.key}
                    cx={point.x}
                    cy={point.y}
                    r={3.5}
                    className={tone.dot}
                  >
                    <title>{`${item.label}: ${criterion.shortLabel} ${formatScore(item.scores[criterion.key])}`}</title>
                  </circle>
                )
              })}
            </g>
          )
        })}
      </svg>

      <ul className="flex flex-wrap justify-center gap-4 text-xs text-content-muted">
        {series.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn('size-2.5 rounded-full', TONE_CLASS[item.tone].swatch)}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
