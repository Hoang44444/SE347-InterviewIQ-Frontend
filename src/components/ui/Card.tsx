import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

/* Tên prop trùng tên token trong tokens.css — đổi token là đổi cả app. */
const PADDING_CLASS = {
  none: 'p-0',
  sm: 'p-(--space-sm)',
  md: 'p-(--space-md)',
  lg: 'p-(--space-lg)',
  xl: 'p-(--space-xl)',
} as const

export interface CardProps {
  padding?: keyof typeof PADDING_CLASS
  /** Thêm hiệu ứng hover khi cả thẻ là một liên kết bấm được. */
  interactive?: boolean
  className?: string
  children: ReactNode
}

export function Card({ padding = 'md', interactive = false, className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface shadow-card',
        PADDING_CLASS[padding],
        interactive && 'transition hover:border-brand-400 hover:shadow-popover',
        className,
      )}
    >
      {children}
    </div>
  )
}
