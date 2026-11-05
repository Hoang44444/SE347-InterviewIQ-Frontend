/*
 * Khớp UserProfileResponseDto của backend (modules/user).
 * Mọi route hồ sơ đều là /users/me: backend lấy id từ access token,
 * không route nào nhận user id từ client.
 */

/** Hồ sơ đầy đủ, trả về từ GET /users/me và từ PATCH /users/me. */
export interface UserProfile {
  /** publicId (UUID), trùng với claim sub của access token. */
  id: string
  email: string
  fullName: string
  /** null cho tới khi người dùng tải ảnh đại diện lên. */
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

/**
 * PATCH /users/me: field vắng mặt nghĩa là giữ nguyên, nên chỉ gửi ô đã sửa.
 * Backend trả 400 nếu body không có field nào.
 */
export interface UpdateProfilePayload {
  email?: string
  fullName?: string
}
