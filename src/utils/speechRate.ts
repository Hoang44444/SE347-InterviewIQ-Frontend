import {
  SPEECH_MIN_WINDOW_SECONDS,
  SPEECH_WINDOW_SECONDS,
  SPEECH_WPM_FAST,
  SPEECH_WPM_SLOW,
  TRANSCRIPT_MAX_LENGTH,
} from '@/constants/speech'
import type { PaceStatus } from '@/types/speech'

/** Số từ, tách theo khoảng trắng (mỗi âm tiết tiếng Việt là một từ). */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Từ/phút. Trả null khi chưa có thời gian trôi qua để tránh chia cho 0. */
export function calculateWpm(wordCount: number, elapsedSeconds: number): number | null {
  if (!(elapsedSeconds > 0)) return null
  return Math.round((wordCount / elapsedSeconds) * 60)
}

export function getPaceStatus(
  wpm: number | null,
  thresholds: { slow?: number; fast?: number } = {},
): PaceStatus | null {
  if (wpm === null) return null
  const { slow = SPEECH_WPM_SLOW, fast = SPEECH_WPM_FAST } = thresholds
  if (wpm < slow) return 'slow'
  if (wpm > fast) return 'fast'
  return 'good'
}

/** Tổng số từ tại một thời điểm, tính theo thời gian đã nghe (giây). */
export interface WordSnapshot {
  at: number
  totalWords: number
}

/**
 * Tốc độ trong cửa sổ trượt gần nhất. Trả null khi đã nghe chưa đủ
 * SPEECH_MIN_WINDOW_SECONDS. Cửa sổ chưa đầy thì chia cho thời gian đã nghe.
 */
export function windowedWpm(
  snapshots: readonly WordSnapshot[],
  now: number,
  totalWords: number,
  windowSeconds = SPEECH_WINDOW_SECONDS,
  minSeconds = SPEECH_MIN_WINDOW_SECONDS,
): number | null {
  if (now < minSeconds) return null
  const span = Math.min(now, windowSeconds)
  const cutoff = now - span
  let before = 0
  for (const snapshot of snapshots) {
    if (snapshot.at > cutoff) break
    before = snapshot.totalWords
  }
  return calculateWpm(Math.max(0, totalWords - before), span)
}

/**
 * Nối một đoạn đã chốt vào transcript, thêm khoảng trắng giữa hai đoạn. Vượt
 * maxLength thì cắt ở ranh giới từ gần nhất và báo truncated.
 */
export function appendFinalSegment(
  current: string,
  segment: string,
  maxLength = TRANSCRIPT_MAX_LENGTH,
): { text: string; truncated: boolean } {
  const addition = segment.trim()
  if (!addition) return { text: current, truncated: false }
  const joined = current ? `${current} ${addition}` : addition
  if (joined.length <= maxLength) return { text: joined, truncated: false }

  let cut = joined.slice(0, maxLength)
  if (!/\s/.test(joined.charAt(maxLength))) {
    const lastSpace = cut.search(/\s\S*$/)
    if (lastSpace > 0) cut = cut.slice(0, lastSpace)
  }
  return { text: cut.trimEnd(), truncated: true }
}
