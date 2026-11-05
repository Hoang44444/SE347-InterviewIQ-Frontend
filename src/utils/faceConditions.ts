import { FACE_THRESHOLDS } from '@/constants/integrity'
import type { FaceCondition, FaceObservation } from '@/types/integrity'

const RAD_TO_DEG = 180 / Math.PI

/**
 * Góc yaw/pitch (độ) từ ma trận biến đổi 4x4 của MediaPipe (column-major).
 * Mặt nhìn thẳng cho ma trận đơn vị nên yaw = pitch = 0.
 */
export function headPoseFromMatrix(data: ArrayLike<number>): { yawDeg: number; pitchDeg: number } {
  // Phần xoay r[hàng][cột] = data[cột * 4 + hàng]; phân rã theo thứ tự Z-Y-X.
  const r20 = data[2]
  const r21 = data[6]
  const r22 = data[10]
  return {
    yawDeg: -Math.asin(Math.max(-1, Math.min(1, r20))) * RAD_TO_DEG,
    pitchDeg: Math.atan2(r21, r22) * RAD_TO_DEG,
  }
}

/** Các điều kiện đang đúng tại một lần lấy mẫu, chưa tính thời gian giữ. */
export function classifyFace(observation: FaceObservation): FaceCondition[] {
  if (observation.faceCount === 0) return ['NO_FACE']
  if (observation.faceCount > 1) return ['MULTIPLE_FACES']
  const { yawDeg, pitchDeg } = observation
  const away =
    (yawDeg !== null && Math.abs(yawDeg) > FACE_THRESHOLDS.maxYawDeg) ||
    (pitchDeg !== null && Math.abs(pitchDeg) > FACE_THRESHOLDS.maxPitchDeg)
  return away ? ['LOOKING_AWAY'] : []
}

export interface ConditionStart {
  condition: FaceCondition
  /** Thời điểm điều kiện bắt đầu đúng (trước khi đủ thời gian giữ). */
  startedAt: number
}

export interface ConditionEnd extends ConditionStart {
  endedAt: number
}

interface TrackState {
  /** Lần đầu tiên điều kiện đúng trong chuỗi hiện tại. */
  since: number | null
  /** Đã đủ thời gian giữ và đã phát sự kiện bắt đầu. */
  active: boolean
  /** Lần đầu điều kiện hết đúng sau khi active; null nếu vẫn đang đúng. */
  clearSince: number | null
}

const CONDITIONS: FaceCondition[] = ['NO_FACE', 'MULTIPLE_FACES', 'LOOKING_AWAY']

/**
 * Máy trạng thái chống báo nhầm: một điều kiện chỉ thành sự kiện khi đúng liên tục
 * đủ sustainMs, và chỉ kết thúc khi hết đúng liên tục recoverMs.
 */
export function createConditionTracker(
  sustainMs: Record<FaceCondition, number> = FACE_THRESHOLDS.sustainMs,
  recoverMs: number = FACE_THRESHOLDS.recoverMs,
) {
  const states = Object.fromEntries(
    CONDITIONS.map((condition) => [condition, { since: null, active: false, clearSince: null }]),
  ) as Record<FaceCondition, TrackState>

  function update(observation: FaceObservation) {
    const present = new Set(classifyFace(observation))
    const started: ConditionStart[] = []
    const ended: ConditionEnd[] = []
    for (const condition of CONDITIONS) {
      const state = states[condition]
      if (present.has(condition)) {
        state.clearSince = null
        state.since ??= observation.time
        if (!state.active && observation.time - state.since >= sustainMs[condition]) {
          state.active = true
          started.push({ condition, startedAt: state.since })
        }
      } else if (state.active) {
        state.clearSince ??= observation.time
        if (observation.time - state.clearSince >= recoverMs) {
          ended.push({ condition, startedAt: state.since!, endedAt: state.clearSince })
          states[condition] = { since: null, active: false, clearSince: null }
        }
      } else {
        // Chưa đủ thời gian giữ mà đã hết: bỏ qua, coi như nhiễu.
        state.since = null
      }
    }
    return { started, ended }
  }

  /** Đóng mọi điều kiện đang mở, dùng khi dừng giám sát. */
  function flush(time: number): ConditionEnd[] {
    const ended: ConditionEnd[] = []
    for (const condition of CONDITIONS) {
      const state = states[condition]
      if (state.active) {
        ended.push({ condition, startedAt: state.since!, endedAt: state.clearSince ?? time })
      }
      states[condition] = { since: null, active: false, clearSince: null }
    }
    return ended
  }

  return { update, flush }
}
