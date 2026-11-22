import { BANK_MAX_ITEMS, BANK_PICK_MAX, BANK_PICK_MIN } from '@/constants/questionBank'
import type { ApiError } from '@/types/api'

export type BankErrorKind =
  'invalid' | 'not-found' | 'bank-full' | 'not-created' | 'server' | 'network' | 'other'

export interface BankError {
  kind: BankErrorKind
  message: string
}

const NETWORK: BankError = {
  kind: 'network',
  message: 'Không nhận được phản hồi từ máy chủ. Hãy kiểm tra mạng rồi thử lại.',
}

/**
 * Mỗi endpoint của ngân hàng có một hàm mô tả lỗi riêng: cùng là 409 nhưng
 * "ngân hàng đầy" (lưu) và "phiên đã bắt đầu" (dùng cho phiên) là hai chuyện
 * khác nhau, nên không suy luận chỉ từ mã HTTP và không dùng chung thông báo.
 */

/** GET /question-bank */
export function describeBankListError(error: ApiError): BankError {
  switch (error.status) {
    case 0:
      return NETWORK
    case 400:
      return { kind: 'invalid', message: 'Bộ lọc không hợp lệ. Hãy bỏ lọc rồi thử lại.' }
    case 500:
      return { kind: 'server', message: 'Máy chủ đang gặp sự cố. Hãy thử lại sau ít phút.' }
    default:
      return { kind: 'other', message: 'Không tải được ngân hàng câu hỏi. Hãy thử lại.' }
  }
}

/** DELETE /question-bank/:id. Backend idempotent nên không có 404. */
export function describeBankDeleteError(error: ApiError): BankError {
  switch (error.status) {
    case 0:
      return NETWORK
    case 400:
      return { kind: 'invalid', message: 'Câu hỏi này không hợp lệ nên không xoá được.' }
    case 500:
      return { kind: 'server', message: 'Máy chủ đang gặp sự cố. Hãy thử xoá lại sau ít phút.' }
    default:
      return { kind: 'other', message: 'Không xoá được câu hỏi. Hãy thử lại.' }
  }
}

/** POST /question-bank (lưu câu của một phiên vào ngân hàng). */
export function describeSaveToBankError(error: ApiError): BankError {
  switch (error.status) {
    case 0:
      return NETWORK
    case 400:
      return {
        kind: 'invalid',
        message: 'Không có câu hỏi hợp lệ để lưu. Hãy sinh câu hỏi cho phiên trước.',
      }
    case 404:
      return {
        kind: 'not-found',
        message: 'Phiên hoặc câu hỏi này không còn khả dụng. Hãy tải lại trang.',
      }
    case 409:
      return {
        kind: 'bank-full',
        message: `Ngân hàng đã đầy (tối đa ${BANK_MAX_ITEMS} câu) nên chưa lưu được câu nào. Hãy xoá bớt câu cũ trong trang Ngân hàng câu hỏi rồi thử lại.`,
      }
    case 500:
      return { kind: 'server', message: 'Máy chủ đang gặp sự cố. Hãy thử lưu lại sau ít phút.' }
    default:
      return { kind: 'other', message: 'Không lưu được vào ngân hàng. Hãy thử lại.' }
  }
}

/** POST /interview-session/:id/questions/from-bank (dùng câu của ngân hàng cho phiên). */
export function describeFromBankError(error: ApiError): BankError {
  switch (error.status) {
    case 0:
      return NETWORK
    case 400:
      return {
        kind: 'invalid',
        message: `Hãy chọn từ ${BANK_PICK_MIN} đến ${BANK_PICK_MAX} câu khác nhau.`,
      }
    case 404:
      return {
        kind: 'not-found',
        message:
          'Phiên không còn khả dụng, hoặc một câu đã chọn không còn trong ngân hàng của bạn. Bộ câu hỏi hiện tại không đổi.',
      }
    case 409:
      return {
        kind: 'not-created',
        message: 'Phiên đã bắt đầu nên không thể đổi bộ câu hỏi. Hãy tải lại trang.',
      }
    case 500:
      return {
        kind: 'server',
        message: 'Máy chủ đang gặp sự cố. Bộ câu hỏi hiện tại không đổi, bạn có thể thử lại.',
      }
    default:
      return { kind: 'other', message: 'Không dùng được các câu đã chọn. Hãy thử lại.' }
  }
}
