import { apiClient } from './apiClient'

import type { ApiError, ApiSuccessResponse } from '@/types/api'
import type {
  DashboardDateRange,
  HistoryInsightState,
  InterviewStats,
  InterviewStatsQuery,
} from '@/types/dashboard'
import {
  RANGE_REVERSED_MESSAGE,
  endOfLocalDayIso,
  isRangeReversed,
  startOfLocalDayIso,
} from '@/utils/dateRange'

/**
 * Số buổi gần nhất vẽ lên biểu đồ xu hướng. Backend chặn ở 100; số trung bình
 * vẫn tính trên mọi buổi khớp lọc, không phụ thuộc con số này.
 */
export const DASHBOARD_TREND_LIMIT = 20

/** Không lọc ngày: dùng làm giá trị khởi tạo và làm mốc để biết đang có lọc hay không. */
export const EMPTY_DASHBOARD_RANGE: DashboardDateRange = { fromDate: '', toDate: '' }

export function hasActiveDateRange(range: DashboardDateRange): boolean {
  return range.fromDate !== '' || range.toDate !== ''
}

/** Lỗi phát sinh ở FE trước khi gọi backend, cùng dạng ApiError để UI xử lý một kiểu. */
function clientError(message: string): ApiError {
  return { status: 0, message }
}

/**
 * Dựng query cho GET /interviews/stats.
 *
 * Chỉ đặt key khi thật sự có giá trị: axios bỏ qua param undefined nhưng vẫn
 * gửi chuỗi rỗng, mà `?fromDate=` thì backend trả 400 vì chuỗi rỗng không phải
 * ISO 8601 — bỏ lọc lại thành lỗi.
 *
 * Mốc ngày phải quy đổi sang đầu/cuối ngày địa phương chứ không gửi thẳng
 * "yyyy-MM-dd": xem chú thích trong utils/dateRange.
 */
function toStatsQuery(range: DashboardDateRange): InterviewStatsQuery {
  const query: InterviewStatsQuery = { limit: DASHBOARD_TREND_LIMIT }

  const fromDate = range.fromDate === '' ? null : startOfLocalDayIso(range.fromDate)
  if (fromDate) query.fromDate = fromDate

  const toDate = range.toDate === '' ? null : endOfLocalDayIso(range.toDate)
  if (toDate) query.toDate = toDate

  return query
}

export const dashboardService = {
  /**
   * Thống kê điểm của chính người đang đăng nhập, giới hạn trong khoảng ngày
   * được chọn. Lịch sử rỗng hay khoảng ngày không có buổi nào vẫn là 200.
   */
  async getStats(range: DashboardDateRange = EMPTY_DASHBOARD_RANGE): Promise<InterviewStats> {
    // Chặn ở đây để người dùng thấy lỗi ngay cạnh ô ngày, thay vì đợi backend
    // trả 400 rồi hiện một thông báo chung chung ở đầu trang.
    if (isRangeReversed(range.fromDate, range.toDate)) {
      throw clientError(RANGE_REVERSED_MESSAGE)
    }

    const { data } = await apiClient.get<ApiSuccessResponse<InterviewStats>>('/interviews/stats', {
      params: toStatsQuery(range),
    })
    return data.data
  },

  /**
   * Nhận xét AI đã lưu. Không bao giờ làm backend gọi AI, nên gọi mỗi lần mở
   * trang được. Không nhận khoảng ngày: backend tổng hợp trên toàn bộ lịch sử.
   */
  async getInsight(): Promise<HistoryInsightState> {
    const { data } =
      await apiClient.get<ApiSuccessResponse<HistoryInsightState>>('/interviews/insight')
    return data.data
  },

  /**
   * Tạo hoặc cập nhật nhận xét. Lịch sử không đổi thì backend trả lại bản cũ
   * ngay; có buổi mới thì backend gọi AI đồng bộ nên request có thể mất vài giây.
   */
  async refreshInsight(): Promise<HistoryInsightState> {
    const { data } =
      await apiClient.post<ApiSuccessResponse<HistoryInsightState>>('/interviews/insight')
    return data.data
  },
}
