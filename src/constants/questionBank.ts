import { DIFFICULTY_LABEL, DOMAIN_LABEL } from './interview'

import type { SelectOption } from '@/components/ui'
import type { QuestionDifficulty, QuestionDomain } from '@/types/interview'

/** Backend chặn pageSize ở 100; giữ một hằng số, không nhận giá trị từ URL. */
export const BANK_PAGE_SIZE = 20

/** Mỗi người giữ tối đa ngần này câu; vượt thì POST /question-bank trả 409. */
export const BANK_MAX_ITEMS = 200

/** Số câu được chọn từ ngân hàng cho một phiên (3 đến 10, không lặp). */
export const BANK_PICK_MIN = 3
export const BANK_PICK_MAX = 10

/** Backend từ chối `search` dài hơn 100 ký tự bằng 400. */
export const BANK_SEARCH_MAX_LENGTH = 100

/** Chờ người dùng ngừng gõ rồi mới gọi API. */
export const BANK_SEARCH_DEBOUNCE_MS = 350

const DOMAINS = Object.keys(DOMAIN_LABEL) as QuestionDomain[]
const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as QuestionDifficulty[]

/**
 * Mục "tất cả" là option thật với value rỗng (không dùng placeholder: option
 * placeholder bị disabled nên không chọn lại để bỏ lọc được).
 */
export const DOMAIN_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Tất cả lĩnh vực' },
  ...DOMAINS.map((value) => ({ value, label: DOMAIN_LABEL[value] })),
]

export const DIFFICULTY_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Tất cả độ khó' },
  ...DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABEL[value] })),
]

/** Ô chọn khi sinh: lựa chọn đầu nghĩa là không gửi trường đó. */
export const DOMAIN_GENERATE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Hỗn hợp' },
  ...DOMAINS.map((value) => ({ value, label: DOMAIN_LABEL[value] })),
]

export const DIFFICULTY_GENERATE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Tăng dần' },
  ...DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABEL[value] })),
]

/** Ô chọn khi sinh lại một câu: lựa chọn đầu là giữ nguyên giá trị của câu cũ. */
export const DOMAIN_REGENERATE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Giữ lĩnh vực' },
  ...DOMAINS.map((value) => ({ value, label: DOMAIN_LABEL[value] })),
]

export const DIFFICULTY_REGENERATE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Giữ độ khó' },
  ...DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABEL[value] })),
]
