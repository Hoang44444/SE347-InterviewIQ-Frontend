import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from '@/contexts/auth-context'

/** Lấy state đăng nhập. Ném lỗi nếu quên bọc AuthProvider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth phai duoc dung ben trong <AuthProvider>')
  }
  return context
}
