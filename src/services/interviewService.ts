import { apiClient } from './apiClient'

import type { ApiResponse, Paginated } from '@/types/api'
import type { Answer, CreateInterviewPayload, Interview, Question } from '@/types/interview'

export const interviewService = {
  async create(payload: CreateInterviewPayload): Promise<Interview> {
    const { data } = await apiClient.post<ApiResponse<Interview>>('/interviews', payload)
    return data.data
  },

  async list(page = 1, pageSize = 10): Promise<Paginated<Interview>> {
    const { data } = await apiClient.get<ApiResponse<Paginated<Interview>>>('/interviews', {
      params: { page, pageSize },
    })
    return data.data
  },

  async getById(id: string): Promise<Interview> {
    const { data } = await apiClient.get<ApiResponse<Interview>>(`/interviews/${id}`)
    return data.data
  },

  async getQuestions(id: string): Promise<Question[]> {
    const { data } = await apiClient.get<ApiResponse<Question[]>>(`/interviews/${id}/questions`)
    return data.data
  },

  async submitAnswer(id: string, answer: Answer): Promise<void> {
    await apiClient.post(`/interviews/${id}/answers`, answer)
  },
}
