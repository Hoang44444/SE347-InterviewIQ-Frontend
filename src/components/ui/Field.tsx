import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

export interface FieldProps {
  /** Id của control bên trong, dùng cho thuộc tính htmlFor. */
  id: string
  label?: string
  /** Mô tả ngắn dưới ô nhập, ẩn đi khi có lỗi. */
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

/**
 * Khung bao quanh một ô nhập liệu: nhãn, phần mô tả, thông báo lỗi.
 * Input/Textarea/Select đều dùng chung khung này nên khoảng cách
 * và kiểu chữ của form ở mọi luồng đều giống nhau.
 */
export function Field({ id, label, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-content">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-danger-600">
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-content-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
