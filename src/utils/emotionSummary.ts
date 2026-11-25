import { EMOTION_MAX_TIMELINE_POINTS, EMOTION_MIN_VALID_RATIO } from '@/constants/emotion'
import type {
  EmotionSample,
  EmotionState,
  EmotionSummary,
  EmotionTimelinePoint,
} from '@/types/emotion'

/** Thứ tự ưu tiên khi hai trạng thái xuất hiện bằng nhau: neutral thắng. */
const TIE_ORDER: readonly EmotionState[] = ['neutral', 'positive', 'surprised']

const round4 = (value: number) => Math.round(value * 10000) / 10000
const round1 = (value: number) => Math.round(value * 10) / 10

/** Chọn `limit` điểm rải đều, luôn giữ điểm đầu và điểm cuối. */
function thin<T>(items: readonly T[], limit: number): T[] {
  if (items.length <= limit) return [...items]
  return Array.from(
    { length: limit },
    (_, k) => items[Math.floor((k * (items.length - 1)) / (limit - 1))],
  )
}

/**
 * Gộp các mẫu của MỘT câu trả lời thành `emotionSummary` gửi backend.
 * Trả null khi không đủ dữ liệu đáng tin: không có mẫu, hoặc dưới EMOTION_MIN_VALID_RATIO
 * số mẫu thấy mặt (camera lỗi, model không tải được, ứng viên rời khung hình).
 */
export function summarizeEmotion(
  samples: readonly EmotionSample[],
  sampleIntervalMs: number,
): EmotionSummary | null {
  const valid = samples.filter(
    (sample): sample is EmotionSample & { state: EmotionState } => sample.state !== null,
  )
  if (valid.length === 0 || valid.length / samples.length < EMOTION_MIN_VALID_RATIO) return null

  const counts: Record<EmotionState, number> = { neutral: 0, positive: 0, surprised: 0 }
  for (const sample of valid) counts[sample.state] += 1

  const distribution: EmotionSummary['distribution'] = {}
  for (const state of TIE_ORDER) {
    if (counts[state] > 0) distribution[state] = round4(counts[state] / valid.length)
  }

  // Duyệt theo TIE_ORDER và chỉ đổi khi lớn hơn hẳn nên hòa thì giữ trạng thái đứng trước.
  let dominant: EmotionState = TIE_ORDER[0]
  for (const state of TIE_ORDER) {
    if (counts[state] > counts[dominant]) dominant = state
  }

  const start = samples[0].time
  const timeline: EmotionTimelinePoint[] = valid.map((sample) => ({
    t: round1((sample.time - start) / 1000),
    state: sample.state,
    gazeAway: sample.gazeAway,
  }))

  return {
    sampleIntervalMs,
    sampleCount: samples.length,
    validSampleCount: valid.length,
    distribution,
    gazeAwayRatio: round4(valid.filter((sample) => sample.gazeAway).length / valid.length),
    dominant,
    timeline: thin(timeline, EMOTION_MAX_TIMELINE_POINTS),
  }
}
