import type { EmotionLabel, ScoringStreamConnectionState, SessionScore } from '@/types/scoring'

/** Thời gian chờ tăng dần (ms) khi kết nối lại SSE sau lỗi mạng/5xx. */
export const SCORING_STREAM_BACKOFF_MS = [1000, 2000, 4000, 8000, 15000] as const

export interface ScoreCriterionMeta {
  key: keyof Pick<SessionScore, 'contentScore' | 'relevanceScore' | 'confidenceScore'>
  label: string
  shortLabel: string
  weightLabel: string
}

/** Ba trụ cột chấm điểm theo Rubric v2.0 (40% / 40% / 20%). */
export const SCORE_CRITERIA: readonly ScoreCriterionMeta[] = [
  { key: 'contentScore', label: 'Chất lượng nội dung', shortLabel: 'Nội dung', weightLabel: '40%' },
  {
    key: 'relevanceScore',
    label: 'Độ phù hợp câu hỏi & CV/JD',
    shortLabel: 'Phù hợp',
    weightLabel: '40%',
  },
  {
    key: 'confidenceScore',
    label: 'Phong thái & sự tự tin',
    shortLabel: 'Tự tin',
    weightLabel: '20%',
  },
]

/** Nhãn tiếng Việt cho 6 danh mục FeedbackCategory chuẩn từ backend. */
export const FEEDBACK_CATEGORY_LABEL: Record<string, string> = {
  TECHNICAL_KNOWLEDGE: 'Kiến thức chuyên môn',
  PROBLEM_SOLVING: 'Giải quyết vấn đề',
  RELEVANCE: 'Độ phù hợp',
  COMMUNICATION: 'Giao tiếp',
  CONFIDENCE: 'Sự tự tin',
  EXPERIENCE: 'Kinh nghiệm',
}

export interface EmotionMeta {
  label: string
  barClass: string
}

/** Thứ tự cố định để thanh cảm xúc và chú thích nhất quán giữa các câu hỏi. */
export const EMOTION_ORDER: readonly EmotionLabel[] = [
  'positive',
  'neutral',
  'happy',
  'surprised',
  'sad',
  'fearful',
  'angry',
  'disgusted',
]

/** Ánh xạ nhãn cảm xúc sang nhãn tiếng Việt và token màu có sẵn trong tokens.css. */
export const EMOTION_META: Record<EmotionLabel, EmotionMeta> = {
  positive: { label: 'Tích cực', barClass: 'bg-success-600' },
  neutral: { label: 'Bình thản', barClass: 'bg-border-strong' },
  happy: { label: 'Vui vẻ', barClass: 'bg-success-600' },
  surprised: { label: 'Ngạc nhiên', barClass: 'bg-info-600' },
  sad: { label: 'Buồn', barClass: 'bg-brand-300' },
  fearful: { label: 'Lo lắng', barClass: 'bg-warning-600' },
  angry: { label: 'Căng thẳng', barClass: 'bg-danger-600' },
  disgusted: { label: 'Khó chịu', barClass: 'bg-brand-800' },
}

export const SCORING_STREAM_STATUS_LABEL: Record<ScoringStreamConnectionState, string> = {
  idle: '',
  connecting: 'Đang kết nối cập nhật trực tiếp…',
  open: 'Đang chờ kết quả trực tiếp',
  reconnecting: 'Mất kết nối, đang thử kết nối lại…',
  stopped: 'Đã dừng cập nhật tự động',
}
