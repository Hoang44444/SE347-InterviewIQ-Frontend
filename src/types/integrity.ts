/** Loại tín hiệu nghi vấn trong lúc phỏng vấn; giai đoạn 1 chỉ ghi nhận, chưa kết luận gian lận. */
export type IntegrityEventType =
  | 'TAB_HIDDEN'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'CAMERA_LOST'
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'LOOKING_AWAY'

export type IntegritySeverity = 'LOW' | 'MEDIUM' | 'HIGH'

export interface IntegrityEvent {
  /** Id cục bộ, chỉ để làm key; backend sẽ cấp publicId khi lưu. */
  id: string
  type: IntegrityEventType
  severity: IntegritySeverity
  /** Câu hỏi đang trả lời lúc sự kiện bắt đầu, để xem lại đúng đoạn video. */
  questionId?: string
  /** ISO 8601. */
  startedAt: string
  /** Vắng mặt nếu sự kiện còn đang diễn ra hoặc là sự kiện tức thời. */
  endedAt?: string
  durationMs?: number
}

/** Điều kiện suy ra từ khung hình camera, có thời gian giữ trước khi thành sự kiện. */
export type FaceCondition = 'NO_FACE' | 'MULTIPLE_FACES' | 'LOOKING_AWAY'

export interface FaceObservation {
  /** performance.now() ở thời điểm lấy mẫu (ms). */
  time: number
  faceCount: number
  /** Độ lệch đầu quanh trục dọc/ngang so với nhìn thẳng; null khi không đo được. */
  yawDeg: number | null
  pitchDeg: number | null
}

export type FaceDetectorState = 'idle' | 'loading' | 'ready' | 'unavailable'
