import type { PageResult } from './api'
import type { QuestionDifficulty, QuestionDomain } from './interview'

/** Một câu hỏi trong ngân hàng của người dùng; độc lập với mọi phiên. */
export interface BankItem {
  /** Public id của câu trong ngân hàng. */
  id: string
  /** 1 đến 500 ký tự. */
  content: string
  domain: QuestionDomain
  difficulty: QuestionDifficulty
  createdAt: string
}

export type BankPage = PageResult<BankItem>

/** Ô trống nghĩa là không lọc theo trường đó và không gửi tham số lên backend. */
export interface BankFilter {
  domain: QuestionDomain | ''
  difficulty: QuestionDifficulty | ''
  search: string
}

export interface BankQuery {
  pageNumber: number
  pageSize: number
  domain?: QuestionDomain
  difficulty?: QuestionDifficulty
  search?: string
}

export interface SaveToBankPayload {
  sessionPublicId: string
  /** 1 đến 10 id; bỏ trống là lưu cả bộ. */
  questionPublicIds?: string[]
}

export interface SaveToBankResult {
  savedCount: number
  skippedCount: number
}
