import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type AuthContextValue } from './auth-context'

import { STORAGE_KEYS } from '@/constants'
import { useToast } from '@/hooks/useToast'
import { setSessionExpiredHandler } from '@/services/apiClient'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import type { ApiError } from '@/types/api'
import type {
  AuthTokens,
  LoginPayload,
  User,
  UserRole,
  VerifyRegistrationPayload,
} from '@/types/auth'
import type { UserProfile } from '@/types/user'
import { decodeAccessToken } from '@/utils/jwt'
import { storage } from '@/utils/storage'

function isUserRole(role: string): role is UserRole {
  return role === 'USER' || role === 'ADMIN'
}

/**
 * Backend chỉ trả cặp token, không kèm hồ sơ: id và role đọc từ access token,
 * phần còn lại tạm lấy từ những gì người dùng vừa nhập cho tới khi
 * GET /users/me trả về hồ sơ thật.
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
   * Phiên được khôi phục đồng bộ từ localStorage nên không có trạng thái chờ:
   * hồ sơ được làm mới ở nền (effect bên dưới) chứ không chặn render.
   * Chặn ở đây là bắt mọi lần mở app chờ thêm một lượt gọi API trước khi thấy
   * nội dung, trong khi phiên cũ đã đủ để vẽ giao diện; token chết thì apiClient
   * xoá phiên và ProtectedRoute đưa về trang đăng nhập.
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

  // Ghi phiên xuống localStorage mỗi khi user đổi (đăng nhập, sửa hồ sơ), để F5
  // không mất. Chỉ ghi khi còn phiên: lúc đăng xuất key đã bị xoá, không ghi lại.
  useEffect(() => {
    if (user) storage.set(STORAGE_KEYS.user, user)
  }, [user])

  const applyProfile = useCallback((profile: UserProfile) => {
    setUser((current) =>
      current
        ? {
            ...current,
            email: profile.email,
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
          }
        : current,
    )
  }, [])

  /*
   * Mở lại app với phiên cũ: hỏi backend hồ sơ mới nhất. Vừa xác nhận token còn
   * dùng được, vừa lấy họ tên và ảnh mà luồng đăng nhập không trả về (người đăng
   * nhập bằng form login chưa bao giờ có fullName trong máy).
   * applyProfile ổn định nên effect chỉ chạy một lần lúc mở app.
   */
  useEffect(() => {
    if (storage.get<string>(STORAGE_KEYS.accessToken) === null) return

    let ignore = false
    userService
      .getMyProfile()
      .then((profile) => {
        if (!ignore) applyProfile(profile)
      })
      .catch(() => {
        // 401 đã do apiClient lo (refresh, hoặc xoá phiên nếu refresh thất bại).
        // Lỗi mạng thì giữ nguyên hồ sơ cũ trong máy, không đá người dùng ra.
      })
    return () => {
      ignore = true
    }
  }, [applyProfile])

  const persist = useCallback((tokens: AuthTokens, profile: Pick<User, 'email' | 'fullName'>) => {
    // Dựng user trước khi ghi gì xuống storage: token hỏng thì không để lại phiên dở dang.
    const nextUser = toUser(tokens.accessToken, profile)
    storage.set(STORAGE_KEYS.accessToken, tokens.accessToken)
    storage.set(STORAGE_KEYS.refreshToken, tokens.refreshToken)
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
      applyProfile,
    }),
    [user, isLoading, login, verifyRegistration, logout, applyProfile],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
