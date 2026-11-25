import { apiClient } from './apiClient'
import { cheatLogService } from './cheatLogService'
import { interviewHistoryService } from './interviewHistoryService'
import { uploadInterviewVideo } from './interviewVideoUpload'

import { GENERATE_QUESTIONS_TIMEOUT } from '@/constants/interview'
import type { ApiSuccessResponse, PageResult } from '@/types/api'
import type {
  Answer,
  CreateInterviewSessionPayload,
  CreateInterviewSessionResult,
  GenerateQuestionsOptions,
  Interview,
  InterviewSession,
  StartInterviewSessionResult,
  Question,
  RegenerateQuestionOptions,
  InterviewRecordingSignedParams,
  SaveAnswerPayload,
  SessionQuestions,
  ScoringJob,
  SubmitInterviewSessionResult,
  SubmitInterviewSessionPayload,
} from '@/types/interview'

/** Bỏ trường undefined; không còn trường nào thì không gửi body. */
function toOptionalBody<T extends object>(options: T): Partial<T> | undefined {
  const entries = Object.entries(options).filter(([, value]) => value !== undefined)
  return entries.length === 0 ? undefined : (Object.fromEntries(entries) as Partial<T>)
}

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
   * Backend chạy đồng bộ tới ~45 giây nên dùng timeout riêng. Trường nào bỏ
   * trống thì không gửi; không có trường nào thì không gửi body.
   */
  async generateQuestions(
    sessionPublicId: string,
    options: GenerateQuestionsOptions = {},
  ): Promise<SessionQuestions> {
    const { data } = await apiClient.post<ApiSuccessResponse<SessionQuestions>>(
      `/interview-session/${sessionPublicId}/questions/generate`,
      toOptionalBody(options),
      { timeout: GENERATE_QUESTIONS_TIMEOUT },
    )
    return data.data
  },

  /**
   * Viết lại một câu tại chỗ (publicId và orderIndex giữ nguyên) và trả về cả
   * bộ đã cập nhật. Bỏ trống `domain`/`difficulty` thì giữ giá trị của câu cũ.
   */
  async regenerateQuestion(
    sessionPublicId: string,
    questionPublicId: string,
    options: RegenerateQuestionOptions = {},
  ): Promise<SessionQuestions> {
    const { data } = await apiClient.post<ApiSuccessResponse<SessionQuestions>>(
      `/interview-session/${sessionPublicId}/questions/${questionPublicId}/regenerate`,
      toOptionalBody(options),
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

  /** Thông tin phòng phỏng vấn, lấy từ API chi tiết của module lịch sử. */
  async getById(id: string): Promise<Interview> {
    const detail = await interviewHistoryService.getById(id)
    return { id: detail.id, title: detail.title, cvPublicId: detail.cv?.id }
  },

  /** Bộ câu hỏi của phiên theo đúng thứ tự, đổi về dạng phòng phỏng vấn dùng. */
  async getQuestions(id: string): Promise<Question[]> {
    const { questions } = await interviewService.getSessionQuestions(id)
    return [...questions]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(({ publicId, content, domain, difficulty }) => ({
        id: publicId,
        content,
        domain,
        difficulty,
      }))
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
