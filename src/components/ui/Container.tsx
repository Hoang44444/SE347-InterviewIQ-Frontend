import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

const WIDTH_CLASS = {
  page: 'max-w-page' /* nội dung chính, tương đương 72rem */,
  form: 'max-w-form' /* form hẹp như đăng nhập */,
  prose: 'max-w-text' /* đoạn văn bản dài */,
} as const

export interface ContainerProps {
  width?: keyof typeof WIDTH_CLASS
  className?: string
  children: ReactNode
}

/**
 * Giới hạn bề ngang và canh giữa. Dùng ở mọi trang thay vì
 * mỗi người tự gõ một con số max-w khác nhau.
 */
export function Container({ width = 'page', className, children }: ContainerProps) {
  return <div className={cn('mx-auto w-full px-4', WIDTH_CLASS[width], className)}>{children}</div>
}
