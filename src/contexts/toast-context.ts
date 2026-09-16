import { createContext } from 'react'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  /** Thời gian tự ẩn, tính bằng ms. Đặt 0 để toast nằm mãi đến khi bấm đóng. */
  duration?: number
}

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

export interface ToastContextValue {
  toasts: ToastItem[]
  /** Hiện một toast bất kỳ, trả về id để có thể tự đóng sớm. */
  show: (options: ToastOptions) => string
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)
