import type { InterviewRecording } from '@/types/recording'

export type InterviewStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'

export type InterviewSessionStatus =
  'CREATED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SCORING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface InterviewSession {
  sessionPublicId: string
  cvPublicId: string | null
  title: string
  status: InterviewSessionStatus
  totalQuestion: number
  jobDescription: string | null
  createdAt: string
  /** Chỉ có sau response Start; API danh sách không trả trường này. */
  startedAt?: string
}

export interface StartInterviewSessionResult {
  sessionPublicId: string
  status: 'IN_PROGRESS'
  startedAt: string
}

export type QuestionKind = 'behavioral' | 'technical' | 'coding'

export interface Question {
  id: string
  kind: QuestionKind
  content: string
  /** Thời gian gợi ý để trả lời, tính bằng giây. */
  suggestedSeconds: number
}

export interface Interview {
  id: string
  title: string
  position: string
  status: InterviewStatus
  questionCount: number
  createdAt: string
  score?: number
  /** CV gắn với session, cần khi nộp session để chấm điểm. */
  cvPublicId?: string
}

export interface Answer {
  publicId: string
  questionPublicId: string
  videoUrl: string
  transcript: string
  /** Thời lượng video được backend xác minh, không phải thời gian trả lời. */
  durationSeconds: number
  createdAt: string
  updatedAt: string
}

export interface InterviewRecordingSignedParams {
  uploadUrl: string
  apiKey: string
  timestamp: number
  signature: string
  cloudinaryPublicId: string
  resourceType: 'video'
  allowedFormats: string
  overwrite: false
  maxFileSizeBytes: number
}

export interface SaveAnswerPayload {
  cloudinaryPublicId: string
  transcript: string
}

export type ScoringJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface SubmitInterviewSessionResult {
  sessionPublicId: string
  jobId: string
  status: ScoringJobStatus
}

export interface ScoringJob {
  jobId: string
  sessionId: string
  status: ScoringJobStatus
  createdAt: string
  completedAt: string | null
}

export interface InterviewSessionTiming {
  startedAt: string
  endedAt: string
  durationSeconds: number
}

export interface SubmitInterviewSessionPayload {
  cvPublicId: string
  totalQuestions: number
  durationSeconds: number
}

/** Cho phép phòng development dùng dữ liệu mẫu mà không gọi backend. */
export interface InterviewRoomService {
  getById: (id: string) => Promise<Interview>
  getQuestions: (id: string) => Promise<Question[]>
  getAnswerSignedParams: (id: string, questionId: string) => Promise<InterviewRecordingSignedParams>
  uploadAnswerVideo: (
    params: InterviewRecordingSignedParams,
    recording: InterviewRecording,
  ) => Promise<string>
  submitAnswer: (id: string, questionId: string, payload: SaveAnswerPayload) => Promise<Answer>
  finishSession: (
    id: string,
    payload: SubmitInterviewSessionPayload,
  ) => Promise<SubmitInterviewSessionResult>
  getScoringJobStatus: (jobId: string, signal?: AbortSignal) => Promise<ScoringJob>
}

export interface CreateInterviewPayload {
  title: string
  position: string
  kind: QuestionKind
}

export interface CreateInterviewSessionPayload {
  /** Public ID của CV, đúng định dạng UUID. */
  cvPublicId: string
  /** Tối đa 255 ký tự; backend cho phép chuỗi rỗng. */
  title: string
  /** Tối đa 10.000 ký tự; không truyền hoặc truyền null thì backend lưu null. */
  jobDescription?: string | null
}

export interface CreateInterviewSessionResult {
  publicId: string
}

/** Thông tin vừa tạo để mở phòng CREATED trước khi backend cung cấp câu hỏi. */
export interface CreatedInterviewSession extends CreateInterviewSessionResult {
  title: string
  cvFileName: string
}

export interface InterviewRoomLocationState {
  createdSession?: CreatedInterviewSession
  session?: InterviewSession
}
