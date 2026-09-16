import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

/* Tên prop trùng tên token trong tokens.css — đổi token là đổi cả app. */
const GAP_CLASS = {
  xs: 'gap-(--space-xs)',
  sm: 'gap-(--space-sm)',
  md: 'gap-(--space-md)',
  lg: 'gap-(--space-lg)',
  xl: 'gap-(--space-xl)',
} as const

export interface StackProps {
  /** 'col' xếp dọc (mặc định), 'row' xếp ngang. */
  direction?: 'col' | 'row'
  gap?: keyof typeof GAP_CLASS
  className?: string
  children: ReactNode
}

/**
 * Khối xếp phần tử với khoảng cách lấy từ thang spacing chung.
 * Tránh việc mỗi luồng tự chế khoảng cách lẻ lung tung ngoài thang chung.
 */
export function Stack({ direction = 'col', gap = 'md', className, children }: StackProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'col' ? 'flex-col' : 'flex-row',
        GAP_CLASS[gap],
        className,
      )}
    >
      {children}
    </div>
  )
}
