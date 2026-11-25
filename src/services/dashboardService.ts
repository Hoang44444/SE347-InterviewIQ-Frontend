import { apiClient } from './apiClient'

import type { ApiSuccessResponse } from '@/types/api'
import type { HistoryInsightState, InterviewStats } from '@/types/dashboard'

/**
 * Số buổi gần nhất vẽ lên biểu đồ xu hướng. Backend chặn ở 100; số trung bình
 * vẫn tính trên mọi buổi, không phụ thuộc con số này.
 */
export const DASHBOARD_TREND_LIMIT = 20

export const dashboardService = {
  /** Thống kê điểm của chính người đang đăng nhập. Lịch sử rỗng vẫn là 200. */
  async getStats(): Promise<InterviewStats> {
    const { data } = await apiClient.get<ApiSuccessResponse<InterviewStats>>('/interviews/stats', {
      params: { limit: DASHBOARD_TREND_LIMIT },
    })
    return data.data
  },

  /** Nhận xét AI đã lưu. Không bao giờ làm backend gọi AI, nên gọi mỗi lần mở trang được. */
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
