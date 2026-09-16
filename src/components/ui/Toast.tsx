import { useEffect, useRef } from 'react'

import { cn } from '@/utils/cn'
import type { ToastItem, ToastTone } from '@/contexts/toast-context'

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'border-success-600/30 bg-success-50 text-success-700',
  error: 'border-danger-600/30 bg-danger-50 text-danger-700',
  warning: 'border-warning-600/30 bg-warning-50 text-warning-700',
  info: 'border-info-600/30 bg-info-50 text-info-700',
}

/** Đường vẽ icon cho từng tone, dùng chung khung svg 20x20. */
const TONE_ICON: Record<ToastTone, string> = {
  success: 'M5 10.5l3.5 3.5L15 7',
  error: 'M7 7l6 6M13 7l-6 6',
  warning: 'M10 6v5M10 14h.01',
  info: 'M10 9v5M10 6h.01',
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  return (
    <div
      // alert đọc ngay lập tức, status đọc khi rảnh — lỗi thì cần đọc ngay.
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        // Toast cố tình để vuông góc, không bo góc như thẻ và modal.
        'animate-toast-in pointer-events-auto flex w-80 items-start gap-3 rounded-none border p-4 shadow-popover',
        TONE_CLASS[toast.tone],
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 size-5 shrink-0" aria-hidden>
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
        <path
          d={TONE_ICON[toast.tone]}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm opacity-90">{toast.description}</p>}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Đóng thông báo"
        className="-mr-1 rounded-none p-1 opacity-60 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
          <path
            d="M6 6l8 8M14 6l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

export interface ToastViewportProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

/**
 * Vùng hiện toast ở góc dưới bên phải.
 *
 * Dùng thuộc tính popover để vùng này được đẩy lên top layer giống như
 * <dialog>. Nếu không, toast phát ra từ trong một modal sẽ bị nền mờ của
 * modal che mất — z-index thường không thể thắng được top layer.
 * Trình duyệt cũ không hỗ trợ popover thì thẻ div vẫn hiện bình thường
 * nhờ position fixed, chỉ mất ưu thế xếp lớp.
 */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = viewportRef.current
    if (!element || typeof element.showPopover !== 'function') return

    const isOpen = element.matches(':popover-open')
    if (toasts.length > 0 && !isOpen) element.showPopover()
    else if (toasts.length === 0 && isOpen) element.hidePopover()
  }, [toasts.length])

  return (
    <div
      ref={viewportRef}
      popover="manual"
      aria-live="polite"
      className="pointer-events-none fixed right-0 bottom-0 z-[var(--z-toast)] flex flex-col-reverse gap-3 p-4"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}
