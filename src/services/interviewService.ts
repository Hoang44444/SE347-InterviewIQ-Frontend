import { apiClient } from './apiClient'

import type { ApiSuccessResponse, Paginated } from '@/types/api'
import type {
  Answer,
  CreateInterviewPayload,
  CreateInterviewSessionPayload,
  CreateInterviewSessionResult,
  Interview,
  Question,
} from '@/types/interview'

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

  async create(payload: CreateInterviewPayload): Promise<Interview> {
    const { data } = await apiClient.post<ApiSuccessResponse<Interview>>('/interviews', payload)
    return data.data
  },

  async list(page = 1, pageSize = 10): Promise<Paginated<Interview>> {
    const { data } = await apiClient.get<ApiSuccessResponse<Paginated<Interview>>>('/interviews', {
      params: { page, pageSize },
    })
    return data.data
  },

  async getById(id: string): Promise<Interview> {
    const { data } = await apiClient.get<ApiSuccessResponse<Interview>>(`/interviews/${id}`)
    return data.data
  },

  async getQuestions(id: string): Promise<Question[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<Question[]>>(
      `/interviews/${id}/questions`,
    )
    return data.data
  },

  async submitAnswer(id: string, answer: Answer): Promise<void> {
    await apiClient.post(`/interviews/${id}/answers`, answer)
  },
}
