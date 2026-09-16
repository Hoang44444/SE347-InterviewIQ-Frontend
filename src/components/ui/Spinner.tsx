import { cn } from '@/utils/cn'

const SIZE_CLASS = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-10 border-[3px]',
} as const

export interface SpinnerProps {
  size?: keyof typeof SIZE_CLASS
  className?: string
  /** Đọc cho trình đọc màn hình. */
  label?: string
}

export function Spinner({ size = 'md', className, label = 'Dang tai' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-border border-t-brand-600',
        SIZE_CLASS[size],
        className,
      )}
    />
  )
}
