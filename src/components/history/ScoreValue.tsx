import { MAX_SCORE, scoreTone, type ScoreTone } from '@/constants/history'
import { cn } from '@/utils/cn'
import { formatScore } from '@/utils/format'

/** Màu chữ và màu thanh của từng dải điểm, lấy từ token trạng thái. */
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

export interface ScoreValueProps {
  /** null khi buổi phỏng vấn chưa chấm xong. */
  score: number | null
  /** 'lg' cho trang chi tiết, 'sm' cho một dòng trong danh sách. */
  size?: 'sm' | 'lg'
  /** Hiện thanh tỉ lệ dưới con số. */
  showBar?: boolean
  className?: string
}

/**
 * Điểm tổng của một buổi phỏng vấn.
 *
 * Chưa có điểm thì hiện dấu gạch kèm chữ, không hiện 0,0: điểm 0 là một kết quả
 * thật, còn "chưa chấm" là chưa có kết quả nào.
 */
export function ScoreValue({ score, size = 'sm', showBar = false, className }: ScoreValueProps) {
  if (score === null) {
    return (
      <p className={cn('text-sm text-content-subtle', className)}>
        <span aria-hidden>—</span>
        <span className="sr-only">Chưa có điểm</span>
      </p>
    )
  }

  const tone = scoreTone(score)
  // Kẹp trong 0-100% để một điểm ngoài thang (nếu backend đổi) không làm vỡ thanh.
  const percent = Math.min(100, Math.max(0, (score / MAX_SCORE) * 100))

  return (
    <div className={cn('min-w-0', className)}>
      <p className={cn('font-bold', TEXT_CLASS[tone], size === 'lg' ? 'text-4xl' : 'text-lg')}>
        {formatScore(score)}
        <span
          className={cn('font-medium text-content-subtle', size === 'lg' ? 'text-base' : 'text-xs')}
        >
          /{MAX_SCORE}
        </span>
      </p>
      {showBar && (
        // Thanh chỉ nhắc lại con số bên trên nên ẩn với trình đọc màn hình.
        <div
          aria-hidden
          className={cn(
            'mt-2 w-full overflow-hidden rounded-full bg-surface-sunken',
            size === 'lg' ? 'h-2' : 'h-1',
          )}
        >
          <div
            className={cn('h-full rounded-full', BAR_CLASS[tone])}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  )
}
