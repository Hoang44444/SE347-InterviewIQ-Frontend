/** Dạng response chung mà backend trả về. */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

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
}
