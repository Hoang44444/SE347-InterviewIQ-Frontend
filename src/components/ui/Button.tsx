import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Spinner } from './Spinner'

import { cn } from '@/utils/cn'

/**
 * Quy ước chọn variant:
 *  - primary   : hành động chính của màn hình, mỗi màn chỉ nên có một cái
 *  - secondary : hành động phụ, đặt cạnh primary
 *  - ghost     : hành động nhẹ trong thanh công cụ, không cần viền
 *  - danger    : hành động phá huỷ (xoá, huỷ buổi phỏng vấn)
 *  - link      : trông như một đường dẫn, không có nền
 */
const VARIANT_CLASS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
  secondary:
    'bg-surface text-content ring-1 ring-border-strong hover:bg-surface-muted focus-visible:outline-brand-600',
  ghost: 'text-content-muted hover:bg-surface-sunken focus-visible:outline-brand-600',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 focus-visible:outline-danger-600',
  link: 'text-brand-600 underline-offset-4 hover:underline focus-visible:outline-brand-600',
} as const

const SIZE_CLASS = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASS
  size?: keyof typeof SIZE_CLASS
  /** Hiện spinner và khoá nút trong lúc chờ API. */
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      // Mặc định là "button" để nút trong form không vô tình submit.
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-control font-medium transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {isLoading ? <Spinner size="sm" className="border-current/30 border-t-current" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
}
