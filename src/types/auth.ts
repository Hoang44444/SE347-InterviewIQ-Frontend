/** Khớp CommonUserRole của backend. Dùng union thay cho enum vì tsconfig bật erasableSyntaxOnly. */
export type UserRole = 'USER' | 'ADMIN'

/**
 * Người dùng đang đăng nhập.
 * role chỉ có trong access token nên luôn giải mã từ token; email, họ tên và ảnh
 * lấy từ GET /users/me (AuthProvider gọi khi mở app và sau mỗi lần sửa hồ sơ),
 * tạm dùng giá trị người dùng vừa nhập ở form cho tới khi hồ sơ về.
 */
export interface User {
  /** publicId (UUID), lấy từ claim sub của access token. */
  id: string
  role: UserRole
  email: string
  /** Thiếu khi vừa đăng nhập xong, vì backend không trả họ tên cùng cặp token. */
  fullName?: string
  /** null khi chưa tải ảnh lên, undefined khi chưa đọc được hồ sơ. */
  avatarUrl?: string | null
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

/**
 * Đổi mật khẩu khi đang đăng nhập. Khác luồng quên mật khẩu: phải nhập đúng
 * mật khẩu hiện tại, vì access token một mình không chứng minh được là chủ tài khoản.
 */
export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}
