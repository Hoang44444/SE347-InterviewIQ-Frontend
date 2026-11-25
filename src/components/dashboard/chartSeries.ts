import { SCORE_CRITERIA } from '@/constants/scoring'
import type { InterviewStatsScores } from '@/types/dashboard'

export type ScoreKey = keyof InterviewStatsScores

export interface ScoreSeriesMeta {
  key: ScoreKey
  label: string
  /** Class cho đường/viền trong SVG. */
  strokeClass: string
  /** Class cho chấm điểm trong SVG. */
  fillClass: string
  /** Class cho ô màu trong chú thích (HTML). */
  swatchClass: string
}

function criterionLabel(key: ScoreKey): string {
  return SCORE_CRITERIA.find((criterion) => criterion.key === key)?.shortLabel ?? key
}

/**
 * Bốn đường của biểu đồ xu hướng. Màu lấy từ token trạng thái có sẵn chứ không
 * thêm màu mới; điểm tổng dùng màu thương hiệu và nét đậm để nổi nhất.
 */
export const SCORE_SERIES: readonly ScoreSeriesMeta[] = [
  {
    key: 'overallScore',
    label: 'Điểm tổng',
    strokeClass: 'stroke-brand-600',
    fillClass: 'fill-brand-600',
    swatchClass: 'bg-brand-600',
  },
  {
    key: 'contentScore',
    label: criterionLabel('contentScore'),
    strokeClass: 'stroke-info-600',
    fillClass: 'fill-info-600',
    swatchClass: 'bg-info-600',
  },
  {
    key: 'relevanceScore',
    label: criterionLabel('relevanceScore'),
    strokeClass: 'stroke-success-600',
    fillClass: 'fill-success-600',
    swatchClass: 'bg-success-600',
  },
  {
    key: 'confidenceScore',
    label: criterionLabel('confidenceScore'),
    strokeClass: 'stroke-warning-600',
    fillClass: 'fill-warning-600',
    swatchClass: 'bg-warning-600',
  },
]

const SHORT_DATE = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' })

/** "20/10" cho nhãn trục; chuỗi ISO hỏng thì để trống chứ không vỡ biểu đồ. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : SHORT_DATE.format(date)
}

/** Kẹp điểm vào thang để một giá trị lạ không vẽ ra ngoài khung. */
export function clampScore(score: number, maxScore: number): number {
  return Math.min(maxScore, Math.max(0, score))
}
