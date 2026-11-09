import { apiClient } from './apiClient'
import { cheatLogService } from './cheatLogService'
import { uploadInterviewVideo } from './interviewVideoUpload'

import { GENERATE_QUESTIONS_TIMEOUT } from '@/constants/interview'
import type { ApiSuccessResponse, PageResult } from '@/types/api'
import type {
  Answer,
  CreateInterviewSessionPayload,
  CreateInterviewSessionResult,
  Interview,
  InterviewSession,
  StartInterviewSessionResult,
  Question,
  InterviewRecordingSignedParams,
  SaveAnswerPayload,
  SessionQuestions,
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

  /**
   * Sinh bộ câu hỏi cho phiên CREATED; gọi lại sẽ thay toàn bộ bộ cũ.
   * Backend chạy đồng bộ tới ~45 giây nên dùng timeout riêng. Không truyền
   * `count` thì không gửi body và backend dùng mặc định 5.
   */
  async generateQuestions(sessionPublicId: string, count?: number): Promise<SessionQuestions> {
    const { data } = await apiClient.post<ApiSuccessResponse<SessionQuestions>>(
      `/interview-session/${sessionPublicId}/questions/generate`,
      count === undefined ? undefined : { count },
      { timeout: GENERATE_QUESTIONS_TIMEOUT },
    )
    return data.data
  },

  async getSessionQuestions(sessionPublicId: string): Promise<SessionQuestions> {
    const { data } = await apiClient.get<ApiSuccessResponse<SessionQuestions>>(
      `/interview-session/${sessionPublicId}/questions`,
    )
    return data.data
  },

  /**
   * CHƯA KHỚP BACKEND. `GET /interviews/:id` hiện thuộc module lịch sử và trả về
   * shape khác (totalQuestions, status hoa, cv lồng trong object) — hợp đồng
   * thật nằm ở `interviewHistoryService.getById`. Phòng phỏng vấn vẫn gọi hàm
   * này nên tạm giữ lại; sửa cùng lúc với `getQuestions` bên dưới, vì
   * `/interviews/:id/questions` thì backend không có endpoint nào cả.
   */
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
  cheatLogs: cheatLogService,
}
