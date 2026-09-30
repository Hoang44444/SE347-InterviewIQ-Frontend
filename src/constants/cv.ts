import type { BadgeProps } from '@/components/ui'
import type { ParseStatus } from '@/types/cv'

/**
 * Giới hạn kiểm tra sớm ở FE cho người dùng biết ngay, không phải lớp bảo mật:
 * backend vẫn tự kiểm tra lại bằng dung lượng/định dạng thật do Cloudinary báo về.
 * Giữ khớp với MAX_FILE_SIZE_BYTES bên backend (cv.entity.ts).
 */
export const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024

export const MAX_CV_FILE_NAME_LENGTH = 255

export const CV_MIME_TYPE = 'application/pdf'

/** Upload file lâu hơn request thường nhiều, không dùng REQUEST_TIMEOUT 15 giây. */
export const CV_UPLOAD_TIMEOUT = 120_000

export const PARSE_STATUS_LABEL: Record<ParseStatus, string> = {
  PENDING: 'Chờ phân tích',
  PROCESSING: 'Đang phân tích',
  COMPLETED: 'Đã phân tích',
  FAILED: 'Phân tích lỗi',
}

export const PARSE_STATUS_TONE: Record<ParseStatus, NonNullable<BadgeProps['tone']>> = {
  PENDING: 'neutral',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
}
