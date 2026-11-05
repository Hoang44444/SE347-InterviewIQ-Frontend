import type { ApiError } from '@/types/api'

/** Lỗi bắt được trong catch có phải ApiError đã được apiClient chuẩn hoá không. */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as ApiError).status === 'number' &&
    typeof (error as ApiError).message === 'string'
  )
}

/**
 * Câu báo lỗi cho các trường hợp trang không xử lý riêng.
 * Message của backend là tiếng Anh và viết cho lập trình viên,
 * nên chỉ dùng để phân nhánh chứ không đưa thẳng lên giao diện.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback
  if (error.status === 0) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
  if (error.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.'
  return fallback
}
