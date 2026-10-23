import { AiMascot, type AiMascotMood } from '@/components/brand/AiMascot'
import { Badge } from '@/components/ui'
import { KIND_LABEL, KIND_TONE } from '@/constants/interview'
import type { Question } from '@/types/interview'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'

/* Từ ngưỡng này thanh thời gian chuyển màu nhắc sắp hết thời gian gợi ý. */
const WARNING_RATIO = 0.75

export interface QuestionPanelProps {
  question: Question
  index: number
  total: number
  /** Số giây đã trôi qua kể từ khi mở câu này. */
  questionSeconds: number
  isAnswered: boolean
  mood: AiMascotMood
  /** Lời nhân vật AI nói, đổi theo trạng thái ghi/nộp. */
  caption: string
  className?: string
}

/** Nhân vật AI phỏng vấn đọc câu hỏi, kèm thanh thời gian so với thời gian gợi ý. */
export function QuestionPanel({
  question,
  index,
  total,
  questionSeconds,
  isAnswered,
  mood,
  caption,
  className,
}: QuestionPanelProps) {
  const ratio = question.suggestedSeconds > 0 ? questionSeconds / question.suggestedSeconds : 0
  const isOver = ratio >= 1
  const isNear = !isOver && ratio >= WARNING_RATIO

  return (
    <section aria-label="Câu hỏi hiện tại" className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-4">
        <AiMascot mood={mood} className="w-20 shrink-0" />
        <p aria-hidden className="text-sm text-content-muted">
          {caption}
        </p>
      </div>

      <div className="relative rounded-panel border border-border bg-surface p-(--space-lg) text-content shadow-card">
        {/* Đuôi bong bóng thoại chỉ lên nhân vật. */}
        <span
          aria-hidden
          className="absolute -top-1.5 left-8 size-3 rotate-45 border-t border-l border-border bg-surface"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-content-subtle">
            Câu {index + 1}/{total}
          </span>
          <Badge tone={KIND_TONE[question.kind]}>{KIND_LABEL[question.kind]}</Badge>
          {isAnswered && <Badge tone="success">Đã lưu</Badge>}
        </div>

        {/* key để câu mới hiện lên lại mỗi lần chuyển câu. */}
        <h2
          key={question.id}
          className="mt-3 animate-rise-in text-xl font-semibold text-balance text-content"
        >
          {question.content}
        </h2>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={isOver ? 'text-warning-700' : 'text-content-muted'}>
              {isOver ? 'Đã quá thời gian gợi ý' : 'Thời gian gợi ý'}
            </span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                isOver ? 'text-warning-700' : 'text-content',
              )}
            >
              {formatDuration(questionSeconds)} / {formatDuration(question.suggestedSeconds)}
            </span>
          </div>
          <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            {/*
             * Co giãn bằng scaleX (chỉ chạy trên compositor) thay vì width. Đồng hồ nhảy
             * mỗi giây nên chuyển động tuyến tính 1s cho thanh trôi liền, không giật từng nấc.
             * key theo câu hỏi để sang câu mới thanh về 0 ngay, không chạy lùi.
             */}
            <div
              key={question.id}
              className={cn(
                'h-full origin-left transition-[scale,background-color] duration-1000 ease-linear',
                isOver || isNear ? 'bg-warning-600' : 'bg-brand-600',
              )}
              style={{ scale: `${Math.min(ratio, 1)} 1` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
