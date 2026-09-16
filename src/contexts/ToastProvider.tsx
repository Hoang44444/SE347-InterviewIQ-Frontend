import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  ToastContext,
  type ToastContextValue,
  type ToastItem,
  type ToastOptions,
} from './toast-context'

import { ToastViewport } from '@/components/ui/Toast'

/** Toast tự ẩn sau 4 giây nếu không nói gì khác. */
const DEFAULT_DURATION = 4000

/** Nhiều hơn số này thì bỏ cái cũ nhất, tránh phủ kín màn hình. */
const MAX_VISIBLE = 4

let fallbackId = 0

function createId(): string {
  // randomUUID chỉ có trong secure context; localhost và https đều có.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  fallbackId += 1
  return `toast-${fallbackId}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // Giữ tham chiếu bộ đếm để còn huỷ khi toast bị đóng tay hoặc component tháo ra.
  const timersRef = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timers = timersRef.current
    const timer = timers.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.delete(id)
    }
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = createId()
      const duration = options.duration ?? DEFAULT_DURATION

      setToasts((previous) => {
        const next = [
          ...previous,
          {
            id,
            title: options.title,
            description: options.description,
            tone: options.tone ?? 'info',
          },
        ]
        return next.slice(-MAX_VISIBLE)
      })

      if (duration > 0) {
        timersRef.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        )
      }

      return id
    },
    [dismiss],
  )

  // Dọn sạch bộ đếm còn treo khi provider bị tháo ra.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      show,
      dismiss,
      success: (title, description) => show({ title, description, tone: 'success' }),
      error: (title, description) => show({ title, description, tone: 'error' }),
      warning: (title, description) => show({ title, description, tone: 'warning' }),
      info: (title, description) => show({ title, description, tone: 'info' }),
    }),
    [toasts, show, dismiss],
  )

  return (
    <ToastContext value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  )
}
