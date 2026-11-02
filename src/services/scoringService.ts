import { apiClient } from './apiClient'

import type { ApiSuccessResponse } from '@/types/api'
import type { SessionResult } from '@/types/scoring'

export const scoringService = {
  /**
   * Điểm và nhận xét của một buổi đã chấm xong.
   *
   * Backend trả 400 khi buổi chưa chấm xong, 404 khi chưa có kết quả, 403 khi
   * buổi thuộc người khác. Cả ba đều nghĩa là "chưa có gì để hiện" chứ không
   * phải hệ thống lỗi, nên UI gọi hàm này phải phân biệt chúng với lỗi mạng.
   */
  async getSessionResult(sessionId: string): Promise<SessionResult> {
    const { data } = await apiClient.get<ApiSuccessResponse<SessionResult>>(
      `/scoring/sessions/${encodeURIComponent(sessionId)}/result`,
    )
    return data.data
  },
}
