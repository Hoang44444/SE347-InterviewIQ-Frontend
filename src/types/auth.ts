/** Khớp CommonUserRole của backend. Dùng union thay cho enum vì tsconfig bật erasableSyntaxOnly. */
export type UserRole = 'USER' | 'ADMIN'

/**
 * Người dùng đang đăng nhập.
 * Backend chưa có endpoint trả hồ sơ: id và role giải mã từ access token,
 * còn email và họ tên là giá trị người dùng đã nhập ở form.
 */
export interface User {
  /** publicId (UUID), lấy từ claim sub của access token. */
  id: string
  role: UserRole
  email: string
  /** Chỉ có sau luồng đăng ký, vì backend không trả họ tên khi đăng nhập. */
  fullName?: string
}

export interface LoginPayload {
  email: string
  password: string
}

/** Bước 1 của đăng ký: backend giữ tạm thông tin và gửi OTP về email. */
export interface RegisterPayload {
  fullName: string
  email: string
  password: string
}

/** Backend trả lại email đã chuẩn hoá (trim + chữ thường). */
export interface RegisterResult {
  email: string
}

/** Bước 2 của đăng ký: xác nhận OTP để tạo tài khoản. */
export interface VerifyRegistrationPayload {
  email: string
  otp: string
}

/** Cặp token trả về sau khi đăng nhập hoặc xác nhận đăng ký. */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/** Đăng ký đang chờ nhập OTP, lưu lại để F5 hay quay lại sửa không mất thông tin. */
export interface PendingRegistration {
  email: string
  fullName: string
  /** Mốc gửi OTP gần nhất (ms), để tính thời gian chờ gửi lại. */
  otpSentAt: number
  /** Mốc backend xoá thông tin đăng ký đang chờ (ms). */
  expiresAt: number
}
