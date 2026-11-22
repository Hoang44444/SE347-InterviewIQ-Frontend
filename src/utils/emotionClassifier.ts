import { EMOTION_THRESHOLDS } from '@/constants/emotion'
import type { Blendshapes, EmotionState } from '@/types/emotion'

const SMILE = ['mouthSmileLeft', 'mouthSmileRight'] as const
const BROWS = ['browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'] as const
const EYES_WIDE = ['eyeWideLeft', 'eyeWideRight'] as const
const JAW_OPEN = ['jawOpen'] as const

/** Trung bình các blendshape trong `names`; blendshape vắng mặt tính là 0. */
function average(shapes: Blendshapes, names: readonly string[]): number {
  return names.reduce((sum, name) => sum + (shapes[name] ?? 0), 0) / names.length
}

/** Mức tăng so với mức nền; thấp hơn mức nền thì coi như không có biểu cảm. */
function rise(current: Blendshapes, baseline: Blendshapes, names: readonly string[]): number {
  return Math.max(0, average(current, names) - average(baseline, names))
}

/**
 * Mức nền của người dùng: trung bình từng blendshape trên vài khung hình đầu phiên, lúc họ
 * chưa làm biểu cảm. Máy và camera khác nhau cho mức nền khác nhau (mouthPucker ~0.9 và
 * eyeSquint ~0.4 ở máy thử nghiệm), nên mọi ngưỡng đều tính trên độ chênh so với mức nền.
 */
export function computeBaseline(frames: readonly Blendshapes[]): Blendshapes {
  const totals: Record<string, number> = {}
  for (const frame of frames) {
    for (const [name, score] of Object.entries(frame)) {
      totals[name] = (totals[name] ?? 0) + score
    }
  }
  // Chia cho tổng số khung: khung nào thiếu blendshape thì blendshape đó tính là 0.
  return Object.fromEntries(
    Object.entries(totals).map(([name, sum]) => [name, sum / frames.length]),
  )
}

/**
 * Suy ra trạng thái nét mặt của MỘT khung hình từ điểm blendshape, so với mức nền.
 * - surprised: lông mày, mắt mở to và há miệng cùng tăng. jawOpen tăng cả khi đang nói nên
 *   không bao giờ đủ một mình.
 * - positive: khóe miệng nhếch lên (cười).
 * - neutral: còn lại. Không dùng mouthPucker (model đọc ~0.9 cả khi mặt thả lỏng) và
 *   eyeSquint (luôn ở mức nền cao).
 */
export function classifyEmotion(current: Blendshapes, baseline: Blendshapes): EmotionState {
  const { surprise, smileDelta } = EMOTION_THRESHOLDS
  if (
    rise(current, baseline, BROWS) >= surprise.browDelta &&
    rise(current, baseline, EYES_WIDE) >= surprise.eyeWideDelta &&
    rise(current, baseline, JAW_OPEN) >= surprise.jawOpenDelta
  ) {
    return 'surprised'
  }
  if (rise(current, baseline, SMILE) >= smileDelta) return 'positive'
  return 'neutral'
}
