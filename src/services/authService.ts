import { apiClient } from './apiClient'

import type { ApiSuccessResponse } from '@/types/api'
import type { AuthResult, LoginPayload, RegisterPayload, User } from '@/types/auth'

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<AuthResult>>('/auth/login', payload)
    return data.data
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<AuthResult>>('/auth/register', payload)
    return data.data
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<ApiSuccessResponse<User>>('/auth/me')
    return data.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },
}
