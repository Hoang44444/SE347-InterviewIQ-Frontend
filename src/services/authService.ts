import { apiClient } from './apiClient'

import type { ApiSuccessResponse } from '@/types/api'
import type {
  AuthTokens,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
  VerifyRegistrationPayload,
} from '@/types/auth'

export const authService = {
  async login(payload: LoginPayload): Promise<AuthTokens> {
    const { data } = await apiClient.post<ApiSuccessResponse<AuthTokens>>('/auth/login', payload)
    return data.data
  },

  /**
   * Bước 1 của đăng ký: backend giữ tạm thông tin và gửi OTP 6 số về email.
   * Chưa tạo tài khoản, chưa có token. 409 nếu email đã có tài khoản,
   * 429 nếu email này vừa được gửi OTP chưa quá 60 giây.
   */
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<RegisterResult>>(
      '/auth/register',
      payload,
    )
    return data.data
  },

  /** Gửi OTP mới, OTP cũ mất hiệu lực. Cũng bị chặn 60 giây như bước 1. */
  async resendRegistrationOtp(email: string): Promise<RegisterResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<RegisterResult>>(
      '/auth/register/resend',
      { email },
    )
    return data.data
  },

  /** Bước 2: xác nhận OTP, backend tạo tài khoản rồi đăng nhập luôn. */
  async verifyRegistration(payload: VerifyRegistrationPayload): Promise<AuthTokens> {
    const { data } = await apiClient.post<ApiSuccessResponse<AuthTokens>>(
      '/auth/register/verify',
      payload,
    )
    return data.data
  },

  /** Thu hồi refresh token của thiết bị này. Không cần access token còn hạn. */
  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken })
  },

  /**
   * Đổi mật khẩu của người đang đăng nhập. Backend thu hồi refresh token của MỌI
   * thiết bị, nên gọi xong phải xoá phiên và đăng nhập lại.
   * 401 = mật khẩu hiện tại sai, 400 = mật khẩu mới trùng mật khẩu cũ.
   */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post('/auth/password/change', payload)
  },
}
