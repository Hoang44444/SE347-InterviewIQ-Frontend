import type { BadgeProps } from '@/components/ui'
import type { ParseFailureReason, ParseStatus } from '@/types/cv'

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

/** Phân tích CV chạy đồng bộ (tải PDF + gọi AI) nên có thể mất cả phút. */
export const CV_PARSE_TIMEOUT = 90_000

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

/** Nói rõ vì sao phân tích hỏng để người dùng biết nên thử lại hay thay file. */
export const PARSE_FAILURE_MESSAGE: Record<ParseFailureReason, string> = {
  FILE_UNAVAILABLE: 'Không tìm thấy file CV trên hệ thống lưu trữ. Hãy thay bằng file mới.',
  FILE_UNREADABLE:
    'File PDF bị hỏng, bị khoá mật khẩu hoặc dài quá 20 trang. Hãy thay bằng file khác.',
  NO_TEXT:
    'File PDF không có chữ để đọc (thường là ảnh scan). Hãy thay bằng bản PDF chọn được chữ.',
  AI_FAILED: 'Hệ thống chưa đọc được CV lúc này. Hãy thử phân tích lại.',
}

/** Dùng khi không biết lý do, ví dụ vừa tải lại trang (backend không lưu lý do). */
export const PARSE_FAILURE_FALLBACK =
  'Không đọc được nội dung CV. File có thể là ảnh scan hoặc bị khoá bằng mật khẩu.'

export const CV_LIMIT_MESSAGE = 'Bạn đã đạt số CV tối đa. Hãy xoá bớt một CV cũ rồi tải lại.'

export const CV_BUSY_MESSAGE =
  'CV đang được phân tích hoặc vừa bị thay đổi. Hãy thử lại sau ít phút.'
