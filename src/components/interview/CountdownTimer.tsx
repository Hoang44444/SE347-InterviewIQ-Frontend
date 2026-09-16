import { Badge, Button, Card } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'

/** Dưới ngưỡng này coi là sắp hết giờ và đổi sang màu cảnh báo. */
const WARNING_RATIO = 0.25

export interface CountdownTimerProps {
  secondsLeft: number
  /** Độ dài gốc, để vẽ thanh tiến độ. */
  totalSeconds: number
  isRunning: boolean
  /** Bấm nút Tạm dừng / Tiếp tục. */
  onToggle: () => void
  className?: string
}

/**
 * Đồng hồ đếm ngược của một câu hỏi.
 *
 * Không đặt aria-live cho con số: đọc lại mỗi giây sẽ làm trình đọc màn hình
 * nói liên tục. Lúc hết giờ đã có toast (role="status") báo giúp rồi.
 */
export function CountdownTimer({
  secondsLeft,
  totalSeconds,
  isRunning,
  onToggle,
  className,
}: CountdownTimerProps) {
  const isExpired = secondsLeft === 0
  const ratio = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const isLow = !isExpired && ratio <= WARNING_RATIO

  const state = isExpired ? 'expired' : isLow ? 'low' : isRunning ? 'running' : 'paused'

  const STATE = {
    running: { label: 'Đang đếm', tone: 'info', text: 'text-content', bar: 'bg-brand-600' },
    paused: {
      label: 'Tạm dừng',
      tone: 'neutral',
      text: 'text-content-muted',
      bar: 'bg-border-strong',
    },
    low: { label: 'Sắp hết giờ', tone: 'warning', text: 'text-warning-700', bar: 'bg-warning-600' },
    expired: { label: 'Hết giờ', tone: 'danger', text: 'text-danger-700', bar: 'bg-danger-600' },
  } as const

  const current = STATE[state]

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-content-muted">Thời gian gợi ý</p>
        <Badge tone={current.tone}>{current.label}</Badge>
      </div>

      <p
        role="timer"
        className={cn('mt-2 font-mono text-4xl font-semibold tabular-nums', current.text)}
      >
        {formatDuration(secondsLeft)}
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        {/* Chiều rộng tính theo thời gian còn lại nên buộc phải đặt qua style. */}
        <div
          className={cn('h-full rounded-full transition-[width] duration-200', current.bar)}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>

      <Button
        variant="secondary"
        size="sm"
        fullWidth
        className="mt-4"
        onClick={onToggle}
        disabled={isExpired}
      >
        {isRunning ? 'Tạm dừng' : 'Tiếp tục'}
      </Button>
    </Card>
  )
}
