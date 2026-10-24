/*
 * Các con số dưới đây chép từ backend (RegisterDto, VerifyRegistrationDto,
 * AuthService). Backend vẫn kiểm tra lại, FE chỉ dùng để báo lỗi sớm và
 * hiển thị đồng hồ. Backend đổi luật thì sửa ở đây.
 */
import type { UserRole } from '@/types/auth'

/** Chỉ bắt lỗi gõ nhầm. Backend kiểm tra lại bằng IsEmail. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const FULL_NAME_MAX_LENGTH = 100
export const PASSWORD_MIN_LENGTH = 8
/** bcrypt chỉ đọc 72 byte đầu nên backend chặn ở 72. */
export const PASSWORD_MAX_LENGTH = 72

/** Tên vai trò hiện cho người dùng; CommonUserRole của backend chỉ có hai giá trị. */
export const USER_ROLE_LABEL: Record<UserRole, string> = {
  USER: 'Người dùng',
  ADMIN: 'Quản trị viên',
}

export const OTP_LENGTH = 6
/** OTP sống 5 phút. */
export const OTP_TTL_MINUTES = 5
/** Gửi lại OTP phải cách lần gửi trước ít nhất 60 giây, không thì backend trả 429. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60
/** Thông tin đăng ký đang chờ sống 15 phút và không được gia hạn khi gửi lại OTP. */
export const PENDING_REGISTRATION_TTL_MS = 15 * 60 * 1000

/**
 * Backend trả cùng một mã lỗi cho nhiều tình huống khác nhau, chỉ phân biệt
 * được qua message. Giữ đúng nguyên văn bên AuthService.
 */
export const AUTH_ERROR_MESSAGES = {
  registrationExpired: 'Registration expired, please register again',
  autoLoginFailed: 'Account created but automatic login failed, please log in',
} as const
