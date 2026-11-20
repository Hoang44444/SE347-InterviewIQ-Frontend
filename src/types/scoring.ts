/**
 * Kết quả chấm điểm của một buổi phỏng vấn
 * (GET /scoring/sessions/:sessionId/result).
 *
 * Tách khỏi types/interview.ts vì đây là dữ liệu của Scoring module, còn
 * ScoringJob bên đó là trạng thái hàng đợi của phòng phỏng vấn.
 */

/** Điểm từng mặt và điểm tổng, đều ở thang 0-10. */
export interface SessionScore {
  publicId: string
  contentScore: number
  relevanceScore: number
  confidenceScore: number
  overallScore: number
  scoredAt: string
}

export interface SessionStrength {
  category: string
  title: string
  description: string
}

export interface SessionImprovement {
  category: string
  title: string
  description: string
  /** Gợi ý cách làm; backend để trống nếu không có. */
  suggestion?: string
}

export interface SessionSummary {
  publicId: string
  overallFeedback: string
  strengths: SessionStrength[]
  improvements: SessionImprovement[]
  scoringModel: string
  promptVersion: string | null
  generatedAt: string
}

export type EmotionLabel =
  'neutral' | 'happy' | 'surprised' | 'sad' | 'fearful' | 'angry' | 'disgusted'

export interface EmotionSummary {
  dominant: string
  distribution: Record<string, number>
}

export interface QuestionEmotion {
  questionPublicId: string
  orderIndex: number
  domain: string
  difficulty: string
  durationSeconds: number | null
  emotionSummary: EmotionSummary | null
}

export interface SessionResult {
  sessionId: string
  /** Backend đặt tên field là số nhiều. */
  scores: SessionScore
  summary: SessionSummary
  emotionTimeline?: QuestionEmotion[]
}

export type ScoringJobEventType = 'answer-scored' | 'answer-failed'

export interface ScoringJobEventPayload {
  sessionId: string
  overallScore?: number
  error?: string
}

export interface ScoringJobEvent {
  userId: string
  jobId: string
  type: ScoringJobEventType
  payload: ScoringJobEventPayload
}

export type ScoringStreamConnectionState =
  'idle' | 'connecting' | 'open' | 'reconnecting' | 'stopped'
