/** Điểm 0..1 của các blendshape MediaPipe, khóa là tên như `mouthSmileLeft`, `jawOpen`. */
export type Blendshapes = Readonly<Record<string, number>>

/**
 * Trạng thái nét mặt gửi lên backend (CR-005). Chỉ ba nhãn đọc được ổn định trên blendshapes;
 * giận, buồn, ghê tởm không đọc được nên không có ở đây.
 */
export type EmotionState = 'positive' | 'neutral' | 'surprised'

/** Một mẫu lấy mỗi `sampleIntervalMs` trong lúc trả lời một câu hỏi. */
export interface EmotionSample {
  /** performance.now() lúc lấy mẫu (ms); các mẫu của một câu được xếp theo thời gian. */
  time: number
  /** null khi không có đúng một khuôn mặt; mẫu đó là mẫu không hợp lệ. */
  state: EmotionState | null
  /** Nhìn ra ngoài màn hình (suy ra từ góc đầu). Chỉ có nghĩa khi `state` khác null. */
  gazeAway: boolean
}

export interface EmotionTimelinePoint {
  /** Giây kể từ mẫu đầu tiên của câu trả lời. */
  t: number
  state: EmotionState
  gazeAway: boolean
}

/** Khớp request `emotionSummary` của PUT .../answer (docs/interview-answer-upload.md ở backend). */
export interface EmotionSummary {
  sampleIntervalMs: number
  sampleCount: number
  /** Số mẫu thấy mặt; không vượt `sampleCount`. */
  validSampleCount: number
  /** Tỉ lệ trên mẫu hợp lệ, tổng bằng 1; nhãn không xuất hiện thì không có khóa. */
  distribution: Partial<Record<EmotionState, number>>
  gazeAwayRatio: number
  dominant: EmotionState
  /** Tối đa EMOTION_MAX_TIMELINE_POINTS điểm. */
  timeline: EmotionTimelinePoint[]
}
