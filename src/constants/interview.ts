import type { BadgeProps } from '@/components/ui'
import type { InterviewStatus, QuestionKind } from '@/types/interview'

/**
 * Nhãn và màu của trạng thái buổi phỏng vấn. Khai báo một chỗ để danh sách,
 * phòng phỏng vấn và dashboard không mỗi nơi hiện một kiểu.
 */
export const STATUS_LABEL: Record<InterviewStatus, string> = {
  draft: 'Nháp',
  in_progress: 'Đang diễn ra',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
}

export const STATUS_TONE: Record<InterviewStatus, NonNullable<BadgeProps['tone']>> = {
  draft: 'neutral',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
}

export const KIND_LABEL: Record<QuestionKind, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  coding: 'Coding',
}

export const KIND_TONE: Record<QuestionKind, NonNullable<BadgeProps['tone']>> = {
  behavioral: 'brand',
  technical: 'info',
  coding: 'warning',
}

/** Dùng cho thẻ <Select> khi tạo buổi phỏng vấn mới. */
export const KIND_OPTIONS = (Object.keys(KIND_LABEL) as QuestionKind[]).map((kind) => ({
  value: kind,
  label: KIND_LABEL[kind],
}))
