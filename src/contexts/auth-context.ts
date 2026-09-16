import { createContext } from 'react'

import type { LoginPayload, RegisterPayload, User } from '@/types/auth'

export interface AuthContextValue {
  user: User | null
  /** true khi đang kiểm tra phiên lúc mới mở app. */
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

/**
 * Tách context ra file .ts riêng (không phải .tsx) để Fast Refresh
 * không báo lỗi "only export components" ở file Provider.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
