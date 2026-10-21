import { cn } from '@/utils/cn'

const STEPS = ['Thông tin tài khoản', 'Xác nhận email'] as const

export interface RegisterStepsProps {
  /** Bước đang làm, đếm từ 1. */
  current: 1 | 2
}

/** Cho người dùng biết trước rằng sau form còn một bước nhập mã gửi qua email. */
export function RegisterSteps({ current }: RegisterStepsProps) {
  return (
    <ol aria-label="Các bước đăng ký" className="flex items-center gap-3">
      {STEPS.map((label, index) => {
        const step = index + 1
        const isDone = step < current
        const isCurrent = step === current
        const isLast = step === STEPS.length

        return (
          <li
            key={label}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn('flex items-center gap-2', !isLast && 'flex-1')}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                isCurrent && 'bg-brand-600 text-white',
                isDone && 'bg-brand-100 text-brand-700',
                !isCurrent && !isDone && 'bg-surface-sunken text-content-subtle ring-1 ring-border',
              )}
            >
              {isDone ? (
                <svg viewBox="0 0 20 20" fill="none" className="size-3.5" aria-hidden>
                  <path
                    d="M5 10.5l3.5 3.5L15 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                step
              )}
            </span>

            {/* Màn hẹp chỉ hiện tên bước đang làm để thanh không bị tràn. */}
            <span
              className={cn(
                'text-xs font-medium whitespace-nowrap',
                isCurrent ? 'text-content' : 'hidden text-content-subtle sm:inline',
              )}
            >
              {label}
              {isDone && <span className="sr-only"> (đã xong)</span>}
            </span>

            {!isLast && (
              <span
                aria-hidden
                className={cn('h-px flex-1', isDone ? 'bg-brand-200' : 'bg-border')}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
