import { SESSION_STATUS_LABEL } from './interview'

import type { SelectOption } from '@/components/ui'
import type { InterviewSessionStatus } from '@/types/interview'

/**
 * Backend chặn pageSize ở 100. Giữ một hằng số ở đây và không nhận giá trị từ
 * URL, để không bao giờ gửi một con số bị backend từ chối bằng 400.
 */
export const HISTORY_PAGE_SIZE = 20

/** Thang điểm của backend. Dùng cho mẫu số và cho thanh điểm. */
export const MAX_SCORE = 10

/**
 * Option cho ô lọc trạng thái. Mục "tất cả" là option thật với value rỗng, chứ
 * không dùng prop placeholder của Select: placeholder được render thành option
 * disabled nên người dùng chọn lại nó để bỏ lọc thì không được.
 */
export const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Tất cả trạng thái' },
  ...(Object.keys(SESSION_STATUS_LABEL) as InterviewSessionStatus[]).map((status) => ({
    value: status,
    label: SESSION_STATUS_LABEL[status],
  })),
]

/**
 * Hai trạng thái còn làm tiếp được. Danh sách đưa người dùng vào phòng phỏng
 * vấn chứ không vào trang kết quả, vì buổi chưa nộp thì chưa có gì để xem.
 */
const RESUMABLE_STATUSES: InterviewSessionStatus[] = ['CREATED', 'IN_PROGRESS']

export function isResumable(status: InterviewSessionStatus): boolean {
  return RESUMABLE_STATUSES.includes(status)
}

/**
 * Nhãn nút ở danh sách, theo việc người dùng làm tiếp được gì với buổi đó.
 *
 * Buổi chưa nộp dùng nhãn "Vào phòng"/"Tiếp tục" chứ không phải "Bắt đầu": nút
 * ở đây chỉ điều hướng sang phòng phỏng vấn, còn việc gọi API start là của
 * phòng. Hứa "Bắt đầu" rồi chỉ chuyển trang là nói quá.
 */
export function historyActionLabel(status: InterviewSessionStatus): string {
  if (status === 'CREATED') return 'Vào phòng'
  if (status === 'IN_PROGRESS') return 'Tiếp tục'
  if (status === 'COMPLETED') return 'Xem kết quả'
  return 'Xem chi tiết'
}

/**
 * Dải màu của một điểm số. Hẹp hơn tone của Badge để chỗ dùng chỉ phải khai ba
 * nhánh màu, nhưng vẫn gán được thẳng vào prop tone.
 */
export type ScoreTone = 'success' | 'warning' | 'danger'

/**
 * Ba dải điểm: từ 8 là tốt, từ 5 là cần cải thiện, dưới 5 là yếu.
 * Chia ba thay vì bốn để màu còn mang nghĩa; nhiều dải quá thì người xem phải
 * tra bảng mới hiểu màu nói gì.
 */
export function scoreTone(score: number): ScoreTone {
  if (score >= 8) return 'success'
  if (score >= 5) return 'warning'
  return 'danger'
}
