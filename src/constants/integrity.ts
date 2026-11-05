import type { BadgeProps } from '@/components/ui'
import type { FaceCondition, IntegrityEventType, IntegritySeverity } from '@/types/integrity'

export const INTEGRITY_LABEL: Record<IntegrityEventType, string> = {
  TAB_HIDDEN: 'Rời tab phỏng vấn',
  WINDOW_BLUR: 'Chuyển sang cửa sổ khác',
  FULLSCREEN_EXIT: 'Thoát toàn màn hình',
  CAMERA_LOST: 'Camera bị tắt hoặc mất tín hiệu',
  NO_FACE: 'Không thấy khuôn mặt trong khung hình',
  MULTIPLE_FACES: 'Có nhiều hơn một khuôn mặt',
  LOOKING_AWAY: 'Đang nhìn ra ngoài màn hình',
}

export const INTEGRITY_SEVERITY: Record<IntegrityEventType, IntegritySeverity> = {
  TAB_HIDDEN: 'MEDIUM',
  WINDOW_BLUR: 'LOW',
  FULLSCREEN_EXIT: 'LOW',
  CAMERA_LOST: 'HIGH',
  NO_FACE: 'MEDIUM',
  MULTIPLE_FACES: 'HIGH',
  LOOKING_AWAY: 'LOW',
}

export const INTEGRITY_SEVERITY_TONE: Record<IntegritySeverity, NonNullable<BadgeProps['tone']>> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
}

/**
 * Ngưỡng nhận diện khuôn mặt. Giữ đủ lâu rồi mới thành sự kiện để không báo nhầm
 * khi chớp mắt, gãi đầu hay liếc xuống bàn phím. Pitch rộng hơn yaw vì người dùng
 * có ô ghi chú và hay cúi nhìn bàn phím.
 */
export const FACE_THRESHOLDS = {
  /** Ms điều kiện phải liên tục đúng trước khi ghi nhận. */
  sustainMs: { NO_FACE: 3000, MULTIPLE_FACES: 2000, LOOKING_AWAY: 3000 } satisfies Record<
    FaceCondition,
    number
  >,
  /** Ms điều kiện phải liên tục hết trước khi coi là kết thúc. */
  recoverMs: 1000,
  maxYawDeg: 35,
  maxPitchDeg: 40,
} as const

/** Chu kỳ lấy mẫu khuôn mặt (ms). 2 lần/giây là đủ và nhẹ máy. */
export const FACE_SAMPLE_INTERVAL_MS = 500

/** Chờ trước khi ghi WINDOW_BLUR để tránh đếm trùng với TAB_HIDDEN. */
export const BLUR_GRACE_MS = 300

/**
 * Wasm và model của MediaPipe. Mặc định lấy từ CDN; đặt VITE_FACE_MODEL_URL /
 * VITE_MEDIAPIPE_WASM_URL để tự host (ví dụ trong public/) khi cần.
 */
export const MEDIAPIPE_WASM_URL =
  import.meta.env.VITE_MEDIAPIPE_WASM_URL ??
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'

export const FACE_MODEL_URL =
  import.meta.env.VITE_FACE_MODEL_URL ??
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
