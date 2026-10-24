import { apiClient } from './apiClient'

import {
  ALLOWED_AVATAR_MIME_TYPES,
  AVATAR_UPLOAD_TIMEOUT,
  CLIENT_VALIDATION_CODE,
  MAX_AVATAR_BYTES,
} from '@/constants/user'
import type { ApiError, ApiSuccessResponse } from '@/types/api'
import type { UpdateProfilePayload, UserProfile } from '@/types/user'
import { formatFileSize } from '@/utils/format'

/** Lỗi phát sinh ở FE (chưa gọi backend), cùng dạng ApiError để UI xử lý một kiểu. */
function clientError(message: string): ApiError {
  return { status: 0, message, code: CLIENT_VALIDATION_CODE }
}

/** Kiểm tra sớm cho người dùng biết ngay. Backend vẫn kiểm tra lại, đây không phải lớp bảo mật. */
function validateAvatar(file: File): ApiError | null {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return clientError('Chỉ nhận ảnh JPEG, PNG hoặc WEBP')
  }
  if (file.size === 0) return clientError('File rỗng')
  if (file.size > MAX_AVATAR_BYTES) {
    return clientError(`Ảnh vượt quá ${formatFileSize(MAX_AVATAR_BYTES)}`)
  }
  return null
}

export const userService = {
  /** Hồ sơ của chính người đang đăng nhập. 401 nghĩa là phiên không còn dùng được. */
  async getMyProfile(): Promise<UserProfile> {
    const { data } = await apiClient.get<ApiSuccessResponse<UserProfile>>('/users/me')
    return data.data
  },

  /**
   * Chỉ gửi những field đã sửa: backend coi field vắng mặt là giữ nguyên và trả 400
   * nếu body rỗng. 409 nếu email mới đã thuộc về người khác.
   */
  async updateMyProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const { data } = await apiClient.patch<ApiSuccessResponse<UserProfile>>('/users/me', payload)
    return data.data
  },

  /** Trả URL ảnh mới. Mỗi lần upload sinh một version mới nên URL luôn khác lần trước. */
  async uploadAvatar(file: File): Promise<string> {
    const invalid = validateAvatar(file)
    if (invalid) throw invalid

    const form = new FormData()
    // Tên field phải đúng 'avatar': FileInterceptor('avatar') của backend chỉ đọc field này.
    form.append('avatar', file)

    const { data } = await apiClient.post<ApiSuccessResponse<{ avatarUrl: string }>>(
      '/users/me/avatar',
      form,
      {
        /*
         * Bắt buộc ghi đè Content-Type: apiClient mặc định application/json, mà axios
         * thấy header JSON đi kèm FormData thì serialize form thành JSON — backend nhận
         * body rỗng rồi trả 400. Đặt multipart/form-data thì adapter xhr bỏ luôn header
         * này ra để trình duyệt tự điền kèm boundary.
         */
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: AVATAR_UPLOAD_TIMEOUT,
      },
    )
    return data.data.avatarUrl
  },
}
