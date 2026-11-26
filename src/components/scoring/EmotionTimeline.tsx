import { EmptyState, Stack } from '@/components/ui'
import { EMOTION_META, EMOTION_ORDER } from '@/constants/scoring'
import type { EmotionLabel, QuestionEmotion } from '@/types/scoring'
import { cn } from '@/utils/cn'
import { formatDurationLabel } from '@/utils/format'

export interface EmotionTimelineProps {
  timeline: QuestionEmotion[]
}

interface EmotionSegment {
  emotion: EmotionLabel
  widthPercent: number
  percent: number
}

function getSegments(distribution: Record<string, number>): EmotionSegment[] {
  const entries = EMOTION_ORDER.map((emotion) => ({
    emotion,
    weight: Math.max(0, Number(distribution[emotion] ?? 0)),
  })).filter((entry) => entry.weight > 0)

  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) return []

  return entries.map((entry) => {
    const exactPercent = (entry.weight / total) * 100
    return {
      emotion: entry.emotion,
      widthPercent: exactPercent,
      percent: Math.round(exactPercent),
    }
  })
}

function getEmotionLabel(raw: string): string {
  return raw in EMOTION_META ? EMOTION_META[raw as EmotionLabel].label : raw
}

export function EmotionTimeline({ timeline }: EmotionTimelineProps) {
  const rows = timeline.map((item) => ({
    item,
    segments: item.emotionSummary ? getSegments(item.emotionSummary.distribution) : [],
  }))
  const hasAnyEmotion = rows.some((row) => row.segments.length > 0)

  if (!hasAnyEmotion) {
    return (
      <Stack gap="sm">
        <h3 className="text-sm font-semibold text-content">Biểu cảm theo từng câu hỏi</h3>
        <EmptyState
          title="Buổi này không có dữ liệu biểu cảm"
          description="Không có tín hiệu biểu cảm khuôn mặt nào được ghi nhận trong buổi phỏng vấn này."
        />
      </Stack>
    )
  }

  const usedEmotions = EMOTION_ORDER.filter((emotion) =>
    rows.some((row) => row.segments.some((segment) => segment.emotion === emotion)),
  )

  return (
    <Stack gap="md">
      <h3 className="text-sm font-semibold text-content">Biểu cảm theo từng câu hỏi</h3>

      <ol className="flex flex-col gap-3">
        {rows.map(({ item, segments }, index) => {
          const dominantLabel = item.emotionSummary
            ? getEmotionLabel(item.emotionSummary.dominant)
            : null

          return (
            <li
              key={item.questionPublicId}
              className="grid gap-2 sm:grid-cols-[112px_1fr_96px] sm:items-center"
            >
              <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:gap-0">
                <span className="text-sm font-medium text-content">Câu {index + 1}</span>
                <span className="text-xs text-content-subtle tabular-nums">
                  {formatDurationLabel(item.durationSeconds)}
                </span>
              </div>

              {segments.length > 0 ? (
                <>
                  <div
                    aria-hidden
                    className="flex h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
                  >
                    {segments.map(({ emotion, widthPercent }) => (
                      <div
                        key={emotion}
                        className={cn('h-full', EMOTION_META[emotion].barClass)}
                        style={{ width: `${widthPercent}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium text-content-muted sm:text-right">
                    {dominantLabel}
                    <span className="sr-only">
                      {': '}
                      {segments
                        .map(({ emotion, percent }) => `${EMOTION_META[emotion].label} ${percent}%`)
                        .join(', ')}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-content-subtle sm:col-span-2">
                    <span aria-hidden>—</span>
                    <span className="sr-only">Không có dữ liệu biểu cảm</span>
                  </p>
                </>
              )}
            </li>
          )
        })}
      </ol>

      {usedEmotions.length > 0 && (
        <ul className="flex flex-wrap gap-3 text-xs text-content-muted">
          {usedEmotions.map((emotion) => (
            <li key={emotion} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn('inline-block size-2 rounded-full', EMOTION_META[emotion].barClass)}
              />
              {EMOTION_META[emotion].label}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-content-subtle">
        Biểu cảm chỉ là tín hiệu tham khảo, không dùng để kết luận năng lực.
      </p>
    </Stack>
  )
}
