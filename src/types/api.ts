/** Envelope thành công do backend trả về. */
export interface ApiSuccessResponse<T> {
  readonly statusCode: number
  readonly success: true
  readonly data: T
  readonly message: string
  readonly timestamp: string
}

/** Chi tiết validation theo từng field từ backend. */
export interface ValidationErrorDetail {
  readonly field: string
  readonly messages: string[]
}

/** Envelope lỗi do backend trả về khi HTTP request thất bại. */
export interface ApiErrorResponse {
  readonly statusCode: number
  readonly success: false
  readonly code: string
  readonly message: string
  readonly errors?: ValidationErrorDetail[]
  readonly path: string
  readonly timestamp: string
}

/** Phân biệt hai dạng response bằng trường success. */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/** Response có phân trang. */
export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

/** Lỗi đã được chuẩn hoá từ interceptor, UI chỉ cần đọc message. */
export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
  code?: string
  path?: string
  timestamp?: string
}
