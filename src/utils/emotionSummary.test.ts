import { describe, expect, test } from 'vitest'

import { EMOTION_MAX_TIMELINE_POINTS } from '@/constants/emotion'
import type { EmotionSample, EmotionState } from '@/types/emotion'

import { summarizeEmotion } from './emotionSummary'

const INTERVAL = 2000

/** Mẫu hợp lệ lúc `time` ms. */
function ok(time: number, state: EmotionState, gazeAway = false): EmotionSample {
  return { time, state, gazeAway }
}

/** Mẫu không thấy mặt (hoặc nhiều mặt). */
function noFace(time: number): EmotionSample {
  return { time, state: null, gazeAway: false }
}

describe('summarizeEmotion', () => {
  test('returns null without samples', () => {
    expect(summarizeEmotion([], INTERVAL)).toBeNull()
  })

  test('returns null when no sample has a face', () => {
    expect(summarizeEmotion([noFace(0), noFace(2000), noFace(4000)], INTERVAL)).toBeNull()
  })

  test('returns null below 20% valid samples and keeps the summary at exactly 20%', () => {
    const tenWith = (valid: number) =>
      Array.from({ length: 10 }, (_, i) => (i < valid ? ok(i * 2000, 'neutral') : noFace(i * 2000)))
    expect(summarizeEmotion(tenWith(1), INTERVAL)).toBeNull()
    expect(summarizeEmotion(tenWith(2), INTERVAL)).not.toBeNull()
  })

  test('counts all samples and the valid ones, and passes the interval through', () => {
    const summary = summarizeEmotion(
      [ok(0, 'neutral'), noFace(2000), ok(4000, 'positive'), ok(6000, 'neutral')],
      INTERVAL,
    )
    expect(summary).toMatchObject({ sampleIntervalMs: 2000, sampleCount: 4, validSampleCount: 3 })
  })

  test('distribution is the share of valid samples per state and sums to 1', () => {
    const summary = summarizeEmotion(
      [
        ...[0, 1, 2, 3].map((i) => ok(i * 2000, 'positive')),
        ...[4, 5, 6, 7].map((i) => ok(i * 2000, 'neutral')),
        ok(16000, 'surprised'),
        noFace(18000),
      ],
      INTERVAL,
    )
    expect(summary?.distribution.positive).toBeCloseTo(4 / 9)
    expect(summary?.distribution.neutral).toBeCloseTo(4 / 9)
    expect(summary?.distribution.surprised).toBeCloseTo(1 / 9)
    const total = Object.values(summary?.distribution ?? {}).reduce((sum, v) => sum + v, 0)
    expect(total).toBeCloseTo(1)
  })

  test('omits states that never appear', () => {
    const summary = summarizeEmotion([ok(0, 'neutral'), ok(2000, 'positive')], INTERVAL)
    expect(summary?.distribution).not.toHaveProperty('surprised')
  })

  test('dominant is the most frequent state', () => {
    const summary = summarizeEmotion(
      [ok(0, 'positive'), ok(2000, 'positive'), ok(4000, 'neutral')],
      INTERVAL,
    )
    expect(summary?.dominant).toBe('positive')
  })

  test('a tie goes to neutral', () => {
    const summary = summarizeEmotion(
      [ok(0, 'positive'), ok(2000, 'positive'), ok(4000, 'neutral'), ok(6000, 'neutral')],
      INTERVAL,
    )
    expect(summary?.dominant).toBe('neutral')
  })

  test('gazeAwayRatio counts only valid samples', () => {
    const summary = summarizeEmotion(
      [
        ok(0, 'neutral', true),
        ok(2000, 'neutral'),
        ok(4000, 'neutral'),
        ok(6000, 'neutral'),
        { time: 8000, state: null, gazeAway: true },
      ],
      INTERVAL,
    )
    expect(summary?.gazeAwayRatio).toBeCloseTo(0.25)
  })

  test('timeline has one point per valid sample, in seconds since the first sample', () => {
    // Mẫu đầu không thấy mặt nhưng vẫn là mốc t = 0 của câu trả lời.
    const summary = summarizeEmotion(
      [noFace(1000), ok(3000, 'neutral'), ok(5000, 'positive', true), ok(7000, 'neutral')],
      INTERVAL,
    )
    expect(summary?.timeline).toEqual([
      { t: 2, state: 'neutral', gazeAway: false },
      { t: 4, state: 'positive', gazeAway: true },
      { t: 6, state: 'neutral', gazeAway: false },
    ])
  })

  test('thins a long timeline to the backend limit but keeps the totals exact', () => {
    const samples = Array.from({ length: 1000 }, (_, i) => ok(i * 2000, 'positive'))
    const summary = summarizeEmotion(samples, INTERVAL)
    expect(summary?.timeline.length).toBeLessThanOrEqual(EMOTION_MAX_TIMELINE_POINTS)
    expect(summary?.timeline[0].t).toBe(0)
    const times = summary?.timeline.map((point) => point.t) ?? []
    expect([...times].sort((a, b) => a - b)).toEqual(times)
    // Chỉ timeline bị thưa; số mẫu và phân bố vẫn tính trên toàn bộ.
    expect(summary).toMatchObject({ sampleCount: 1000, validSampleCount: 1000 })
    expect(summary?.distribution.positive).toBeCloseTo(1)
  })
})
