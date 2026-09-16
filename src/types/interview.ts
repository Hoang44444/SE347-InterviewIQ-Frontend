export type InterviewStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'

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
}

export interface Answer {
  questionId: string
  content: string
  durationSeconds: number
}

export interface CreateInterviewPayload {
  title: string
  position: string
  kind: QuestionKind
}
