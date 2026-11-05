import type { Question } from '@/types/interview'
import { cn } from '@/utils/cn'

export interface QuestionProgressProps {
  questions: Question[]
  currentIndex: number
  /** Id các câu đã lưu được câu trả lời lên máy chủ. */
  answeredIds: ReadonlySet<string>
  className?: string
}

/** Tiến độ dạng chấm ở đầu phòng phỏng vấn: đã xong, đang trả lời, chưa tới. */
export function QuestionProgress({
  questions,
  currentIndex,
  answeredIds,
  className,
}: QuestionProgressProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ol aria-label="Tiến độ câu hỏi" className="flex items-center gap-1.5">
        {questions.map((question, index) => {
          const isAnswered = answeredIds.has(question.id)
          const isCurrent = index === currentIndex && !isAnswered
          return (
            <li key={question.id} aria-current={isCurrent ? 'step' : undefined}>
              <span
                aria-hidden
                className={cn(
                  'block h-2 rounded-full transition-[width,background-color] duration-300 ease-out-soft',
                  isAnswered
                    ? 'w-2 bg-success-600'
                    : isCurrent
                      ? 'w-6 bg-brand-600'
                      : 'w-2 bg-border-strong',
                )}
              />
              <span className="sr-only">
                Câu {index + 1}:{' '}
                {isAnswered ? 'đã trả lời' : isCurrent ? 'đang trả lời' : 'chưa tới'}
              </span>
            </li>
          )
        })}
      </ol>
      <p aria-hidden className="text-sm text-content-muted tabular-nums">
        Câu {currentIndex + 1}/{questions.length}
      </p>
    </div>
  )
}
