import { apiClient } from './apiClient'

import type { ApiSuccessResponse } from '@/types/api'
import type { CreateInterviewSessionPayload, CreateInterviewSessionResult } from '@/types/interview'

export const interviewService = {
  /** Tạo phiên từ CV của người dùng hiện tại; response chỉ chứa publicId. */
  async createSession(
    payload: CreateInterviewSessionPayload,
  ): Promise<CreateInterviewSessionResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<CreateInterviewSessionResult>>(
      '/interview-session',
      payload,
    )
    return data.data
  },
}
