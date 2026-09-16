import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

export interface PageHeaderProps {
  title: string
  description?: string
  /** Nút hành động bên phải tiêu đề, ví dụ "Tạo buổi mới". */
  actions?: ReactNode
  className?: string
}

/** Đầu trang thống nhất cho mọi màn hình bên trong app. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold text-content">{title}</h1>
        {description && <p className="mt-1 text-content-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
