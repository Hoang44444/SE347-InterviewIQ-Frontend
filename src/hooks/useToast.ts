import { useContext } from 'react'

import { ToastContext, type ToastContextValue } from '@/contexts/toast-context'

/**
 * Bắn thông báo nổi từ bất kỳ component nào.
 *
 *   const toast = useToast()
 *   toast.success('Lưu thành công')
 *   toast.error('Không kết nối được máy chủ', 'Thử lại sau ít phút')
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast phai duoc dung ben trong <ToastProvider>')
  }
  return context
}
