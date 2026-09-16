import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { API_URL, REQUEST_TIMEOUT, STORAGE_KEYS } from '@/constants'
import type { ApiError } from '@/types/api'
import { storage } from '@/utils/storage'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

/** Request interceptor: tự động gắn access token vào mọi request. */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.get<string>(STORAGE_KEYS.accessToken)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Response interceptor: chuẩn hoá lỗi về dạng ApiError.
 * Riêng 401 thì xoá phiên và đẩy về trang đăng nhập.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const status = error.response?.status ?? 0

    if (status === 401) {
      storage.remove(STORAGE_KEYS.accessToken)
      storage.remove(STORAGE_KEYS.refreshToken)
      storage.remove(STORAGE_KEYS.user)
      // Dùng location thay vì navigate vì đây không phải component React.
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    const apiError: ApiError = {
      status,
      message: error.response?.data?.message ?? error.message ?? 'Đã có lỗi xảy ra',
      errors: error.response?.data?.errors,
    }
    return Promise.reject(apiError)
  },
)
