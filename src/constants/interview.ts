import type { BadgeProps } from '@/components/ui'
import type {
  InterviewSessionStatus,
  InterviewStatus,
  QuestionDifficulty,
  QuestionDomain,
  QuestionKind,
} from '@/types/interview'

export const SESSION_STATUS_LABEL: Record<InterviewSessionStatus, string> = {
  CREATED: 'Đã tạo',
  IN_PROGRESS: 'Đang diễn ra',
  SUBMITTED: 'Đã nộp',
  SCORING: 'Đang chấm điểm',
  COMPLETED: 'Hoàn thành',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã huỷ',
}

export const SESSION_STATUS_TONE: Record<
  InterviewSessionStatus,
  NonNullable<BadgeProps['tone']>
> = {
  CREATED: 'brand',
  IN_PROGRESS: 'info',
  SUBMITTED: 'info',
  SCORING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
}

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

export const DOMAIN_LABEL: Record<QuestionDomain, string> = {
  TECHNICAL: 'Kỹ thuật',
  BEHAVIORAL: 'Hành vi',
  SITUATIONAL: 'Tình huống',
}

export const DOMAIN_TONE: Record<QuestionDomain, NonNullable<BadgeProps['tone']>> = {
  TECHNICAL: 'info',
  BEHAVIORAL: 'brand',
  SITUATIONAL: 'warning',
}

export const DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = {
  EASY: 'Dễ',
  MEDIUM: 'Trung bình',
  HARD: 'Khó',
}

export const DIFFICULTY_TONE: Record<QuestionDifficulty, NonNullable<BadgeProps['tone']>> = {
  EASY: 'success',
  MEDIUM: 'warning',
  HARD: 'danger',
}

/** Khớp ràng buộc count của backend khi sinh câu hỏi. */
export const QUESTION_COUNT_MIN = 3
export const QUESTION_COUNT_MAX = 10
export const QUESTION_COUNT_DEFAULT = 5

export const QUESTION_COUNT_OPTIONS = Array.from(
  { length: QUESTION_COUNT_MAX - QUESTION_COUNT_MIN + 1 },
  (_, index) => {
    const count = QUESTION_COUNT_MIN + index
    return { value: String(count), label: `${count} câu hỏi` }
  },
)

/** Dùng cho thẻ <Select> khi tạo buổi phỏng vấn mới. */
export const KIND_OPTIONS = (Object.keys(KIND_LABEL) as QuestionKind[]).map((kind) => ({
  value: kind,
  label: KIND_LABEL[kind],
}))

export const QUESTION_COUNT_MIN = 3
export const QUESTION_COUNT_MAX = 10
export const QUESTION_COUNT_DEFAULT = 5

/** Sinh câu hỏi chạy đồng bộ tới ~45 giây, dài hơn REQUEST_TIMEOUT 15 giây. */
export const GENERATE_QUESTIONS_TIMEOUT = 60_000

/** Thời gian chờ tối đa mà UI báo cho người dùng. */
export const GENERATE_EXPECTED_SECONDS = 45

export const DOMAIN_LABEL: Record<QuestionDomain, string> = {
  TECHNICAL: 'Kỹ thuật',
  BEHAVIORAL: 'Hành vi',
  SITUATIONAL: 'Tình huống',
}

export const DOMAIN_TONE: Record<QuestionDomain, NonNullable<BadgeProps['tone']>> = {
  TECHNICAL: 'info',
  BEHAVIORAL: 'brand',
  SITUATIONAL: 'neutral',
}

export const DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = {
  EASY: 'Dễ',
  MEDIUM: 'Trung bình',
  HARD: 'Khó',
}

export const DIFFICULTY_TONE: Record<QuestionDifficulty, NonNullable<BadgeProps['tone']>> = {
  EASY: 'success',
  MEDIUM: 'warning',
  HARD: 'danger',
}
