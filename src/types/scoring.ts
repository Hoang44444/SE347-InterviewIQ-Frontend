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

export interface SessionResult {
  sessionId: string
  /** Backend đặt tên field là số nhiều. */
  scores: SessionScore
  summary: SessionSummary
}
