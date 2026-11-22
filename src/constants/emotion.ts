/** Chu kỳ lấy mẫu biểu cảm (ms); vòng nhận diện chạy dày hơn, ta chỉ lấy 1 mẫu mỗi chu kỳ này. */
export const EMOTION_SAMPLE_INTERVAL_MS = 2000

/** Giới hạn của backend cho `timeline`. */
export const EMOTION_MAX_TIMELINE_POINTS = 300

/** Dưới tỉ lệ này số mẫu thấy mặt thì tóm tắt không đáng tin và được bỏ (gửi null). */
export const EMOTION_MIN_VALID_RATIO = 0.2

/** Số mẫu đầu của phiên dùng để tính mức nền của người dùng. */
export const EMOTION_BASELINE_SAMPLE_COUNT = 3

/**
 * Ngưỡng ban đầu rút từ số đo thử nghiệm (một người, một thiết bị): cười đạt mouthSmile ~0.23
 * so với 0.00 lúc nghỉ; jawOpen tăng cả khi đang nói nên KHÔNG dùng một mình cho "ngạc nhiên".
 * Ngưỡng tính trên độ chênh so với mức nền, cần chỉnh lại khi thử với người khác.
 */
export const EMOTION_THRESHOLDS = {
  /** Trung bình mouthSmileLeft/Right vượt mức nền ít nhất bằng này thì là positive. */
  smileDelta: 0.12,
  /** "Ngạc nhiên" chỉ khi cả ba tín hiệu cùng vượt: lông mày, mắt mở to, há miệng. */
  surprise: { browDelta: 0.35, eyeWideDelta: 0.3, jawOpenDelta: 0.35 },
} as const
