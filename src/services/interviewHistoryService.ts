import { apiClient } from './apiClient'

import { HISTORY_PAGE_SIZE } from '@/constants/history'
import type { ApiError, ApiSuccessResponse, PageResult } from '@/types/api'
import type {
  InterviewHistoryDetail,
  InterviewHistoryFilter,
  InterviewHistoryItem,
  InterviewHistoryQuery,
} from '@/types/history'
import { endOfLocalDayIso, isRangeReversed, startOfLocalDayIso } from '@/utils/dateRange'

/** Bộ lọc rỗng: dùng làm giá trị khởi tạo và làm mốc để biết đang có lọc hay không. */
export const EMPTY_HISTORY_FILTER: InterviewHistoryFilter = {
  status: '',
  fromDate: '',
  toDate: '',
}

export function hasActiveFilter(filter: InterviewHistoryFilter): boolean {
  return filter.status !== '' || filter.fromDate !== '' || filter.toDate !== ''
}

/** Lỗi phát sinh ở FE trước khi gọi backend, cùng dạng ApiError để UI xử lý một kiểu. */
function clientError(message: string): ApiError {
  return { status: 0, message }
}

/**
 * Dựng query gửi lên backend từ bộ lọc của UI.
 *
 * Chỉ đặt key khi thật sự có giá trị. axios bỏ qua param undefined nhưng vẫn
 * gửi chuỗi rỗng, mà `?status=` thì backend trả 400 vì chuỗi rỗng không thuộc
 * enum — bỏ lọc lại thành lỗi.
 *
 * Mốc ngày không parse được thì coi như không lọc: <input type="date"> chỉ trả
 * chuỗi rỗng hoặc chuỗi hợp lệ, nên trường hợp này chỉ xảy ra khi giá trị bị
 * dựng bằng tay, và gửi lên cũng chỉ nhận về 400.
 */
function toQuery(pageNumber: number, filter: InterviewHistoryFilter): InterviewHistoryQuery {
  const query: InterviewHistoryQuery = { pageNumber, pageSize: HISTORY_PAGE_SIZE }

  if (filter.status !== '') query.status = filter.status

  const fromDate = filter.fromDate === '' ? null : startOfLocalDayIso(filter.fromDate)
  if (fromDate) query.fromDate = fromDate

  const toDate = filter.toDate === '' ? null : endOfLocalDayIso(filter.toDate)
  if (toDate) query.toDate = toDate

  return query
}

export const interviewHistoryService = {
  /**
   * Lịch sử phỏng vấn của chính người đang đăng nhập, mới nhất trước.
   * Thứ tự sắp xếp do backend quyết định, không nhận tham số sort.
   */
  async list(
    pageNumber = 1,
    filter: InterviewHistoryFilter = EMPTY_HISTORY_FILTER,
  ): Promise<PageResult<InterviewHistoryItem>> {
    // Chặn ở đây để người dùng thấy lỗi ngay cạnh ô ngày, thay vì đợi backend
    // trả 400 rồi hiện một thông báo chung chung ở đầu trang.
    if (isRangeReversed(filter.fromDate, filter.toDate)) {
      throw clientError('"Từ ngày" phải trước hoặc bằng "Đến ngày"')
    }

    const { data } = await apiClient.get<ApiSuccessResponse<PageResult<InterviewHistoryItem>>>(
      '/interviews',
      { params: toQuery(pageNumber, filter) },
    )
    return data.data
  },

  /**
   * Chi tiết một buổi phỏng vấn.
   *
   * 404 cho cả "không tồn tại" và "của người khác": backend cố ý không phân biệt
   * để kẻ tấn công không dò được publicId nào có thật. UI vì vậy không được nói
   * "bạn không có quyền" khi gặp 404.
   */
  async getById(id: string): Promise<InterviewHistoryDetail> {
    const { data } = await apiClient.get<ApiSuccessResponse<InterviewHistoryDetail>>(
      `/interviews/${encodeURIComponent(id)}`,
    )
    return data.data
  },
}
