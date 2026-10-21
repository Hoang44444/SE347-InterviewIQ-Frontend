import { createContext } from 'react'

import type { LoginPayload, User, VerifyRegistrationPayload } from '@/types/auth'

export interface AuthContextValue {
  user: User | null
  /** true khi đang kiểm tra phiên lúc mới mở app. */
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  /**
   * Bước cuối của đăng ký: xác nhận OTP rồi lưu phiên đăng nhập.
   * Bước gửi OTP không đổi trạng thái đăng nhập nên trang gọi thẳng authService.
   */
  verifyRegistration: (payload: VerifyRegistrationPayload, fullName?: string) => Promise<void>
  logout: () => Promise<void>
}

/**
 * Tách context ra file .ts riêng (không phải .tsx) để Fast Refresh
 * không báo lỗi "only export components" ở file Provider.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
