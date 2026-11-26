import { apiClient } from './apiClient'

import { BANK_PAGE_SIZE } from '@/constants/questionBank'
import type { ApiSuccessResponse } from '@/types/api'
import type { SessionQuestions } from '@/types/interview'
import type {
  BankFilter,
  BankPage,
  BankQuery,
  SaveToBankPayload,
  SaveToBankResult,
} from '@/types/questionBank'

export const EMPTY_BANK_FILTER: BankFilter = { domain: '', difficulty: '', search: '' }

export function hasActiveBankFilter(filter: BankFilter): boolean {
  return filter.domain !== '' || filter.difficulty !== '' || filter.search.trim() !== ''
}

/**
 * Chỉ đặt key khi có giá trị: `?domain=` bị backend từ chối 400 vì chuỗi rỗng
 * không thuộc enum. `search` được cắt khoảng trắng hai đầu (backend cũng trim).
 */
function toQuery(pageNumber: number, filter: BankFilter, pageSize: number): BankQuery {
  const query: BankQuery = { pageNumber, pageSize }
  if (filter.domain !== '') query.domain = filter.domain
  if (filter.difficulty !== '') query.difficulty = filter.difficulty
  const search = filter.search.trim()
  if (search !== '') query.search = search
  return query
}

export const questionBankService = {
  /** Ngân hàng của chính người đăng nhập, mới nhất trước. */
  async list(
    pageNumber = 1,
    filter: BankFilter = EMPTY_BANK_FILTER,
    pageSize = BANK_PAGE_SIZE,
  ): Promise<BankPage> {
    const { data } = await apiClient.get<ApiSuccessResponse<BankPage>>('/question-bank', {
      params: toQuery(pageNumber, filter, pageSize),
    })
    return data.data
  },

  /** Lưu câu của một phiên vào ngân hàng; câu trùng bị bỏ qua và tính vào skippedCount. */
  async saveFromSession(payload: SaveToBankPayload): Promise<SaveToBankResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<SaveToBankResult>>(
      '/question-bank',
      payload,
    )
    return data.data
  },

  /** Idempotent: id không có hoặc của người khác cũng trả 200. */
  async remove(itemPublicId: string): Promise<void> {
    await apiClient.delete(`/question-bank/${encodeURIComponent(itemPublicId)}`)
  },

  /** Thay toàn bộ câu hỏi của phiên CREATED bằng các câu đã chọn, đúng thứ tự gửi lên. */
  async useInSession(sessionPublicId: string, itemPublicIds: string[]): Promise<SessionQuestions> {
    const { data } = await apiClient.post<ApiSuccessResponse<SessionQuestions>>(
      `/interview-session/${sessionPublicId}/questions/from-bank`,
      { itemPublicIds },
    )
    return data.data
  },
}
