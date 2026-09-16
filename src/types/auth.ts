/** Dùng union thay cho enum vì tsconfig bật erasableSyntaxOnly. */
export type UserRole = 'candidate' | 'recruiter' | 'admin'

export interface User {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  role: UserRole
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
}

export interface AuthResult {
  user: User
  accessToken: string
  refreshToken: string
}
