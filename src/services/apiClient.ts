import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

import { API_URL, REQUEST_TIMEOUT, STORAGE_KEYS } from '@/constants'
import type { ApiError, ApiErrorResponse, ApiSuccessResponse } from '@/types/api'
import type { AuthTokens } from '@/types/auth'
import { storage } from '@/utils/storage'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

/** Đánh dấu request đã được thử lại sau 401, để không refresh lần thứ hai cho cùng một request. */
type RetriableRequest = InternalAxiosRequestConfig & { _retried?: boolean }

/** Tên khoá Web Locks dùng chung giữa các tab cùng origin. */
const REFRESH_LOCK_NAME = 'interviewiq:refresh-token'

/** Request interceptor: tự động gắn access token vào mọi request. */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.get<string>(STORAGE_KEYS.accessToken)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Chuẩn hoá lỗi của axios về dạng ApiError mà UI dùng. */
function toApiError(error: AxiosError<ApiErrorResponse>): ApiError {
  const body = error.response?.data

  const fieldErrors = body?.errors?.reduce((fields, { field, messages }) => {
    fields.set(field, [...(fields.get(field) ?? []), ...messages])
    return fields
  }, new Map<string, string[]>())

  return {
    status: error.response?.status ?? 0,
    message: body?.message ?? error.message ?? 'Đã có lỗi xảy ra',
    errors: fieldErrors ? Object.fromEntries(fieldErrors) : undefined,
    code: body?.code,
    path: body?.path,
    timestamp: body?.timestamp,
  }
}

/**
 * 401 của /auth/* không có nghĩa là access token hết hạn: ở /auth/login là sai
 * mật khẩu, ở /auth/refresh là refresh token hỏng. Không refresh, không xoá phiên.
 */
function isAuthRequest(config: InternalAxiosRequestConfig): boolean {
  return config.url?.startsWith('/auth/') ?? false
}

type SessionExpiredHandler = (hadSession: boolean) => void
let sessionExpiredHandler: SessionExpiredHandler | null = null

/**
 * AuthProvider đăng ký hàm này để cập nhật state khi phiên hết hẳn (refresh thất bại).
 * `hadSession` là false nếu phiên đã bị xoá từ trước (request 401 thứ hai trở đi,
 * hoặc tab khác đã đăng xuất), để chỉ báo người dùng một lần.
 * Trả về hàm huỷ đăng ký, dùng làm cleanup của useEffect.
 */
export function setSessionExpiredHandler(handler: SessionExpiredHandler): () => void {
  sessionExpiredHandler = handler
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null
  }
}

function endSession() {
  const hadSession = storage.get<string>(STORAGE_KEYS.refreshToken) !== null
  storage.remove(STORAGE_KEYS.accessToken)
  storage.remove(STORAGE_KEYS.refreshToken)
  storage.remove(STORAGE_KEYS.user)
  sessionExpiredHandler?.(hadSession)
}

/**
 * Chạy task khi đang giữ khoá chung giữa các tab, để hai tab không cùng gửi
 * một refresh token. Web Locks chỉ có trong secure context (https, localhost);
 * thiếu thì chạy luôn, vẫn còn khoá trong tab ở refreshAccessToken.
 */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (!('locks' in navigator)) return task()
  return navigator.locks.request(REFRESH_LOCK_NAME, task)
}

/**
 * Đổi refresh token lấy cặp token mới và lưu lại.
 * Trả access token mới, hoặc null nếu phiên đã hết hẳn (backend từ chối refresh token).
 * Lỗi mạng hay lỗi 5xx thì ném ra: refresh token có thể vẫn còn dùng được,
 * không đăng xuất người dùng chỉ vì mạng chập chờn.
 */
async function requestNewTokens(usedRefreshToken: string | null): Promise<string | null> {
  const refreshToken = storage.get<string>(STORAGE_KEYS.refreshToken)
  if (!refreshToken) return null
  // Tab khác đã refresh trong lúc tab này chờ khoá: dùng luôn cặp token tab đó vừa ghi.
  if (refreshToken !== usedRefreshToken) return storage.get<string>(STORAGE_KEYS.accessToken)

  try {
    // Gọi bằng axios thường, không qua apiClient: không gắn access token đã hết hạn,
    // và lỗi của chính lời gọi này không được kích hoạt refresh lồng nhau.
    const { data } = await axios.post<ApiSuccessResponse<AuthTokens>>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { timeout: REQUEST_TIMEOUT },
    )
    storage.set(STORAGE_KEYS.accessToken, data.data.accessToken)
    storage.set(STORAGE_KEYS.refreshToken, data.data.refreshToken)
    return data.data.accessToken
  } catch (error) {
    // 401: token không tồn tại, đã bị thu hồi hoặc hết hạn. 400: sai định dạng.
    const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0
    if (status >= 400 && status < 500) return null
    throw error
  }
}

let pendingRefresh: Promise<string | null> | null = null

/**
 * Mọi request 401 trong lúc đang refresh dùng chung một lần gọi: refresh token
 * bị xoay sau mỗi lần dùng, gửi lại token cũ thì backend từ chối (và quá 10 giây
 * thì backend coi là token bị lộ, thu hồi mọi phiên của tài khoản).
 */
function refreshAccessToken(): Promise<string | null> {
  if (!pendingRefresh) {
    const usedRefreshToken = storage.get<string>(STORAGE_KEYS.refreshToken)
    pendingRefresh = withRefreshLock(() => requestNewTokens(usedRefreshToken)).finally(() => {
      pendingRefresh = null
    })
  }
  return pendingRefresh
}

/**
 * Response interceptor: chuẩn hoá lỗi về dạng ApiError.
 * Riêng 401 của request cần đăng nhập thì refresh token một lần rồi gửi lại request;
 * chỉ khi refresh thất bại mới xoá phiên.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const request = error.config as RetriableRequest | undefined
    if (error.response?.status !== 401 || !request || request._retried || isAuthRequest(request)) {
      return Promise.reject(toApiError(error))
    }
    request._retried = true

    // Token đã được làm mới trong lúc request này đang chờ (ở tab này hoặc tab khác):
    // gửi lại luôn, request interceptor sẽ gắn token mới.
    const currentToken = storage.get<string>(STORAGE_KEYS.accessToken)
    if (currentToken && request.headers.Authorization !== `Bearer ${currentToken}`) {
      return apiClient(request)
    }

    let accessToken: string | null
    try {
      accessToken = await refreshAccessToken()
    } catch (refreshError) {
      return Promise.reject(toApiError(refreshError as AxiosError<ApiErrorResponse>))
    }

    if (!accessToken) {
      endSession()
      return Promise.reject(toApiError(error))
    }
    return apiClient(request)
  },
)
