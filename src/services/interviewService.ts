import { apiClient } from './apiClient'
import { uploadInterviewVideo } from './interviewVideoUpload'

import type { ApiSuccessResponse, PageResult, Paginated } from '@/types/api'
import type {
  Answer,
  CreateInterviewPayload,
  CreateInterviewSessionPayload,
  CreateInterviewSessionResult,
  Interview,
  InterviewSession,
  StartInterviewSessionResult,
  Question,
  InterviewRecordingSignedParams,
  SaveAnswerPayload,
  ScoringJob,
  SubmitInterviewSessionResult,
  SubmitInterviewSessionPayload,
} from '@/types/interview'

export const interviewService = {
  async listSessions(pageNumber = 1, pageSize = 20): Promise<PageResult<InterviewSession>> {
    const { data } = await apiClient.get<ApiSuccessResponse<PageResult<InterviewSession>>>(
      '/interview-session',
      { params: { pageNumber, pageSize } },
    )
    return data.data
  },

  async startSession(sessionPublicId: string): Promise<StartInterviewSessionResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<StartInterviewSessionResult>>(
      `/interview-session/${sessionPublicId}/start`,
    )
    return data.data
  },

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

  async getAnswerSignedParams(
    id: string,
    questionId: string,
  ): Promise<InterviewRecordingSignedParams> {
    const { data } = await apiClient.post<ApiSuccessResponse<InterviewRecordingSignedParams>>(
      `/interview-session/${id}/questions/${questionId}/answer/signed-params`,
    )
    return data.data
  },

  uploadAnswerVideo: uploadInterviewVideo,

  async submitAnswer(id: string, questionId: string, payload: SaveAnswerPayload): Promise<Answer> {
    const { data } = await apiClient.put<ApiSuccessResponse<Answer>>(
      `/interview-session/${id}/questions/${questionId}/answer`,
      payload,
    )
    return data.data
  },

  async finishSession(
    id: string,
    payload: SubmitInterviewSessionPayload,
  ): Promise<SubmitInterviewSessionResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<SubmitInterviewSessionResult>>(
      `/interview-session/${id}/submit`,
      payload,
    )
    return data.data
  },

  async getScoringJobStatus(jobId: string, signal?: AbortSignal): Promise<ScoringJob> {
    const { data } = await apiClient.get<ApiSuccessResponse<ScoringJob>>(
      `/scoring/jobs/${jobId}/status`,
      { signal },
    )
    return data.data
  },
}
