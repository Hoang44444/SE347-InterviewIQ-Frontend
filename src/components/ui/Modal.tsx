import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'

import { cn } from '@/utils/cn'

const SIZE_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

export interface ModalProps {
  open: boolean
  /** Gọi khi người dùng bấm X, bấm ra ngoài hoặc nhấn Escape. */
  onClose: () => void
  title: string
  description?: string
  size?: keyof typeof SIZE_CLASS
  /** Hàng nút ở cuối modal, thường là Huỷ + Xác nhận. */
  footer?: ReactNode
  children?: ReactNode
}

/**
 * Modal dùng thẻ <dialog> của trình duyệt thay vì tự dựng div.
 * Đổi lại được miễn phí: bẫy focus trong modal, trả focus về chỗ cũ
 * khi đóng, đóng bằng phím Escape, và hiện ở top layer nên không bao giờ
 * bị z-index của thành phần khác đè lên.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Đồng bộ prop open với trạng thái thật của thẻ dialog.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // Khoá cuộn trang nền trong lúc modal mở.
  useEffect(() => {
    if (!open) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  /**
   * Sự kiện close của dialog bắn ra cả khi người dùng nhấn Escape lẫn khi
   * ta chủ động gọi close(). Chỉ báo lên cha trong trường hợp đầu.
   */
  function handleNativeClose() {
    if (open) onClose()
  }

  /** Bấm vào vùng nền: lúc đó target chính là thẻ dialog chứ không phải nội dung. */
  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleNativeClose}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      className={cn(
        // Preflight của Tailwind xoá margin nên phải trả lại m-auto để dialog nằm giữa.
        'm-auto w-[calc(100%-2rem)] rounded-panel bg-surface p-0 text-content shadow-modal',
        SIZE_CLASS[size],
      )}
    >
      <div className="animate-modal-in flex flex-col">
        <header className="flex items-start gap-4 border-b border-border px-6 py-4">
          <div className="flex-1">
            <h2 id="modal-title" className="text-lg font-semibold text-content">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-content-muted">{description}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-2 rounded-control p-2 text-content-subtle transition hover:bg-surface-sunken hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden>
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {children && <div className="px-6 py-4">{children}</div>}

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border bg-surface-muted px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  )
}
