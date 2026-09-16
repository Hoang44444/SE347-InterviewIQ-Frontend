import { Card } from '@/components/ui'
import { KIND_LABEL } from '@/constants/interview'
import type { Question } from '@/types/interview'
import { cn } from '@/utils/cn'

export interface QuestionNavigatorProps {
  questions: Question[]
  currentIndex: number
  /** Id các câu đã lưu được câu trả lời lên máy chủ. */
  answeredIds: ReadonlySet<string>
  onSelect: (index: number) => void
  className?: string
}

/** Danh sách câu hỏi bên cạnh, cho phép nhảy qua lại và thấy câu nào đã xong. */
export function QuestionNavigator({
  questions,
  currentIndex,
  answeredIds,
  onSelect,
  className,
}: QuestionNavigatorProps) {
  return (
    <Card padding="md" className={className}>
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="text-sm font-medium text-content-muted">Danh sách câu hỏi</p>
        <p className="text-xs text-content-subtle">
          {answeredIds.size}/{questions.length}
        </p>
      </div>

      <ol className="mt-2 flex flex-col gap-1">
        {questions.map((question, index) => {
          const isCurrent = index === currentIndex
          const isAnswered = answeredIds.has(question.id)

          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                  isCurrent
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-content-muted hover:bg-surface-sunken',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isAnswered
                      ? 'bg-success-600 text-white'
                      : isCurrent
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-sunken text-content-subtle',
                  )}
                >
                  {isAnswered ? '✓' : index + 1}
                </span>

                <span className="min-w-0 flex-1 truncate">{question.content}</span>

                <span className="shrink-0 text-xs text-content-subtle">
                  {KIND_LABEL[question.kind]}
                </span>

                <span className="sr-only">{isAnswered ? 'Đã trả lời' : 'Chưa trả lời'}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
