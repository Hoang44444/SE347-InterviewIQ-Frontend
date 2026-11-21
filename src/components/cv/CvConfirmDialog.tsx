import type { ReactNode } from 'react'

import { Button, Modal } from '@/components/ui'

export interface CvConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** danger cho hành động không hoàn tác được như xoá. */
  tone?: 'primary' | 'danger'
  isLoading?: boolean
  /** Lỗi của lần xác nhận trước, hộp thoại vẫn mở để người dùng thử lại. */
  error?: string
  onConfirm: () => void
  onClose: () => void
}

/** Hộp thoại hỏi lại trước khi xoá CV hoặc thay file (mất kết quả phân tích). */
export function CvConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = 'primary',
  isLoading = false,
  error,
  onConfirm,
  onClose,
}: CvConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      dismissible={!isLoading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Huỷ
          </Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-content-muted">
        {children}
        {error && (
          <p role="alert" className="rounded-control bg-danger-50 px-3 py-2 text-danger-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
