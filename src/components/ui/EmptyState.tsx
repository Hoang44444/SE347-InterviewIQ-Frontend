import type { ReactNode } from 'react'

import { Card } from './Card'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

/** Hiện khi danh sách rỗng, thay vì để màn hình trắng trơn. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card padding="xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-semibold text-content">{title}</h2>
        {description && <p className="max-w-md text-sm text-content-muted">{description}</p>}
        {action}
      </div>
    </Card>
  )
}
