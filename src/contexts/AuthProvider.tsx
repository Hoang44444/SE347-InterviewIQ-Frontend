import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type AuthContextValue } from './auth-context'

import { STORAGE_KEYS } from '@/constants'
import { useToast } from '@/hooks/useToast'
import { setSessionExpiredHandler } from '@/services/apiClient'
import { authService } from '@/services/authService'
import type { ApiError } from '@/types/api'
import type {
  AuthTokens,
  LoginPayload,
  User,
  UserRole,
  VerifyRegistrationPayload,
} from '@/types/auth'
import { decodeAccessToken } from '@/utils/jwt'
import { storage } from '@/utils/storage'

function isUserRole(role: string): role is UserRole {
  return role === 'USER' || role === 'ADMIN'
}

/**
 * Backend chỉ trả cặp token, không kèm hồ sơ: id và role đọc từ access token,
 * phần còn lại lấy từ những gì người dùng vừa nhập.
 */
function toUser(accessToken: string, profile: Pick<User, 'email' | 'fullName'>): User {
  const claims = decodeAccessToken(accessToken)
  if (!claims || !isUserRole(claims.role)) {
    const error: ApiError = { status: 0, message: 'Phiên đăng nhập không hợp lệ' }
    throw error
  }
  return { id: claims.sub, role: claims.role, ...profile }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Đọc localStorage ngay ở lần render đầu (lazy initializer) nên không cần useEffect.
  const [user, setUser] = useState<User | null>(() => storage.get<User>(STORAGE_KEYS.user))

  /**
   * Phiên được khôi phục đồng bộ nên mặc định không có trạng thái chờ.
   * Backend chưa có endpoint trả hồ sơ người dùng; khi có thì gọi nó ở đây để
   * xác thực token lúc mở app, đổi giá trị khởi tạo thành true và
   * setIsLoading(false) trong .finally().
   */
  const [isLoading] = useState(false)

  const toast = useToast()

  // Refresh token hết hạn hoặc bị thu hồi: apiClient đã xoá storage, ở đây chỉ cần
  // bỏ user để ProtectedRoute đưa về trang đăng nhập (nhớ trang đang mở để quay lại).
  useEffect(
    () =>
      setSessionExpiredHandler((hadSession) => {
        setUser(null)
        if (hadSession) {
          toast.warning('Phiên đăng nhập đã hết hạn', 'Vui lòng đăng nhập lại để tiếp tục.')
        }
      }),
    [toast],
  )

  const persist = useCallback((tokens: AuthTokens, profile: Pick<User, 'email' | 'fullName'>) => {
    // Dựng user trước khi ghi gì xuống storage: token hỏng thì không để lại phiên dở dang.
    const nextUser = toUser(tokens.accessToken, profile)
    storage.set(STORAGE_KEYS.accessToken, tokens.accessToken)
    storage.set(STORAGE_KEYS.refreshToken, tokens.refreshToken)
    storage.set(STORAGE_KEYS.user, nextUser)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      persist(await authService.login(payload), { email: payload.email.trim().toLowerCase() })
    },
    [persist],
  )

  const verifyRegistration = useCallback(
    async (payload: VerifyRegistrationPayload, fullName?: string) => {
      persist(await authService.verifyRegistration(payload), { email: payload.email, fullName })
    },
    [persist],
  )

  const logout = useCallback(async () => {
    const refreshToken = storage.get<string>(STORAGE_KEYS.refreshToken)
    try {
      if (refreshToken) await authService.logout(refreshToken)
    } finally {
      // Dù API lỗi vẫn phải xoá phiên ở phía client.
      storage.remove(STORAGE_KEYS.accessToken)
      storage.remove(STORAGE_KEYS.refreshToken)
      storage.remove(STORAGE_KEYS.user)
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      verifyRegistration,
      logout,
    }),
    [user, isLoading, login, verifyRegistration, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
