import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type AuthContextValue } from './auth-context'

import { STORAGE_KEYS } from '@/constants'
import { authService } from '@/services/authService'
import type { AuthResult, LoginPayload, RegisterPayload, User } from '@/types/auth'
import { storage } from '@/utils/storage'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Đọc localStorage ngay ở lần render đầu (lazy initializer) nên không cần useEffect.
  const [user, setUser] = useState<User | null>(() => storage.get<User>(STORAGE_KEYS.user))

  /**
   * Phiên được khôi phục đồng bộ nên mặc định không có trạng thái chờ.
   * Nếu sau này cần gọi authService.getMe() để xác thực token với server,
   * hãy đổi giá trị khởi tạo thành true và setIsLoading(false) trong .finally().
   */
  const [isLoading] = useState(false)

  const persist = useCallback((result: AuthResult) => {
    storage.set(STORAGE_KEYS.accessToken, result.accessToken)
    storage.set(STORAGE_KEYS.refreshToken, result.refreshToken)
    storage.set(STORAGE_KEYS.user, result.user)
    setUser(result.user)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      persist(await authService.login(payload))
    },
    [persist],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      persist(await authService.register(payload))
    },
    [persist],
  )

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      // Dù API lỗi vẫn phải xoá phiên ở phía client.
      storage.remove(STORAGE_KEYS.accessToken)
      storage.remove(STORAGE_KEYS.refreshToken)
      storage.remove(STORAGE_KEYS.user)
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: user !== null, login, register, logout }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
