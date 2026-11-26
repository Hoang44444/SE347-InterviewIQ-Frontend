import { renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'

import { useEmotionCollector } from './useEmotionCollector'

import type { FaceObservation } from '@/types/integrity'

const NEUTRAL = {}
const SMILE = { mouthSmileLeft: 0.3, mouthSmileRight: 0.3 }

function observation(time: number, overrides: Partial<FaceObservation> = {}): FaceObservation {
  return { time, faceCount: 1, yawDeg: 0, pitchDeg: 0, blendshapes: NEUTRAL, ...overrides }
}

/** Gửi một quan sát mỗi 500ms (nhịp của vòng nhận diện) trong `ms` mili giây. */
function feed(
  onObservation: (value: FaceObservation) => void,
  from: number,
  ms: number,
  make: (time: number) => FaceObservation,
) {
  for (let time = from; time < from + ms; time += 500) onObservation(make(time))
}

function setup(questionId = 'q1', recording = true) {
  return renderHook((props) => useEmotionCollector(props), {
    initialProps: { questionId: questionId as string | undefined, recording },
  })
}

test('collects nothing while not recording', () => {
  const { result } = setup('q1', false)
  feed(result.current.onObservation, 0, 10_000, (time) => observation(time))
  expect(result.current.summarize('q1')).toBeNull()
})

test('takes one sample per sampling interval from the faster detector loop', () => {
  const { result } = setup()
  feed(result.current.onObservation, 0, 10_000, (time) => observation(time))
  expect(result.current.summarize('q1')).toMatchObject({
    sampleIntervalMs: 2000,
    sampleCount: 5,
    validSampleCount: 5,
  })
})

test('measures expressions against the baseline taken from the first valid samples', () => {
  const { result } = setup()
  // 3 mẫu đầu thả lỏng làm mức nền, 5 mẫu sau cười.
  feed(result.current.onObservation, 0, 6_000, (time) => observation(time))
  feed(result.current.onObservation, 6_000, 10_000, (time) =>
    observation(time, { blendshapes: SMILE }),
  )
  const summary = result.current.summarize('q1')
  expect(summary?.dominant).toBe('positive')
  expect(summary?.distribution.positive).toBeCloseTo(5 / 8)
  expect(summary?.distribution.neutral).toBeCloseTo(3 / 8)
})

test('a face looking away is flagged and counted in gazeAwayRatio', () => {
  const { result } = setup()
  feed(result.current.onObservation, 0, 4_000, (time) => observation(time))
  feed(result.current.onObservation, 4_000, 4_000, (time) => observation(time, { yawDeg: 60 }))
  expect(result.current.summarize('q1')?.gazeAwayRatio).toBeCloseTo(0.5)
})

test('samples without exactly one face count as samples but not as valid ones', () => {
  const { result } = setup()
  feed(result.current.onObservation, 0, 6_000, (time) => observation(time))
  feed(result.current.onObservation, 6_000, 2_000, (time) =>
    observation(time, { faceCount: 0, blendshapes: undefined }),
  )
  feed(result.current.onObservation, 8_000, 2_000, (time) =>
    observation(time, { faceCount: 2, blendshapes: SMILE }),
  )
  expect(result.current.summarize('q1')).toMatchObject({ sampleCount: 5, validSampleCount: 3 })
})

test('returns null when the face was rarely visible', () => {
  const { result } = setup()
  feed(result.current.onObservation, 0, 10_000, (time) =>
    observation(time, { faceCount: 0, blendshapes: undefined }),
  )
  expect(result.current.summarize('q1')).toBeNull()
})

test('keeps questions apart', () => {
  const { result, rerender } = setup('q1')
  feed(result.current.onObservation, 0, 4_000, (time) => observation(time))
  rerender({ questionId: 'q2', recording: true })
  feed(result.current.onObservation, 4_000, 6_000, (time) => observation(time))
  expect(result.current.summarize('q1')?.sampleCount).toBe(2)
  expect(result.current.summarize('q2')?.sampleCount).toBe(3)
})

test('starting to record a question again discards the samples of the previous take', () => {
  const { result, rerender } = setup('q1')
  feed(result.current.onObservation, 0, 8_000, (time) => observation(time))
  rerender({ questionId: 'q1', recording: false })
  rerender({ questionId: 'q1', recording: true })
  feed(result.current.onObservation, 20_000, 4_000, (time) => observation(time))
  expect(result.current.summarize('q1')?.sampleCount).toBe(2)
})

test('summarizing twice gives the same result so a failed save can be retried', () => {
  const { result } = setup()
  feed(result.current.onObservation, 0, 6_000, (time) => observation(time))
  expect(result.current.summarize('q1')).toEqual(result.current.summarize('q1'))
})
