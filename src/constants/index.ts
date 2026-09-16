/** Key lưu trong localStorage. Gom một chỗ để tránh gõ nhầm chuỗi. */
export const STORAGE_KEYS = {
  accessToken: 'interviewiq:access_token',
  refreshToken: 'interviewiq:refresh_token',
  user: 'interviewiq:user',
} as const

export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'InterviewIQ'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

/** Thời gian chờ tối đa cho một request (ms). */
export const REQUEST_TIMEOUT = 15_000
