import { describe, expect, test } from 'vitest'

import { classifyEmotion, computeBaseline } from './emotionClassifier'

describe('computeBaseline', () => {
  test('averages each blendshape across frames', () => {
    const baseline = computeBaseline([
      { mouthSmileLeft: 0.1, jawOpen: 0.2 },
      { mouthSmileLeft: 0.3, jawOpen: 0 },
    ])
    expect(baseline.mouthSmileLeft).toBeCloseTo(0.2)
    expect(baseline.jawOpen).toBeCloseTo(0.1)
  })

  test('counts a blendshape missing from a frame as 0', () => {
    expect(computeBaseline([{ jawOpen: 1 }, {}]).jawOpen).toBeCloseTo(0.5)
  })

  test('returns an empty baseline without frames', () => {
    expect(computeBaseline([])).toEqual({})
  })
})

describe('classifyEmotion', () => {
  test('a relaxed face is neutral', () => {
    expect(classifyEmotion({}, {})).toBe('neutral')
  })

  test('a smile well above the resting level is positive', () => {
    // Số đo thật: cười đạt mouthSmile ~0.23 so với 0.00 lúc nghỉ.
    expect(classifyEmotion({ mouthSmileLeft: 0.23, mouthSmileRight: 0.23 }, {})).toBe('positive')
  })

  test('a smile is measured against the person own baseline', () => {
    const resting = { mouthSmileLeft: 0.2, mouthSmileRight: 0.2 }
    expect(classifyEmotion({ mouthSmileLeft: 0.23, mouthSmileRight: 0.23 }, resting)).toBe(
      'neutral',
    )
  })

  test('being below the baseline never counts as an expression', () => {
    const resting = { mouthSmileLeft: 0.4, mouthSmileRight: 0.4 }
    expect(classifyEmotion({}, resting)).toBe('neutral')
  })

  test('talking with the mouth open is not surprise', () => {
    // Khi đang nói, jawOpen cao liên tục nhưng lông mày và mắt không đổi.
    expect(classifyEmotion({ jawOpen: 0.6 }, {})).toBe('neutral')
  })

  test('raised brows, wide eyes and an open jaw together are surprised', () => {
    const surprised = {
      browInnerUp: 0.8,
      browOuterUpLeft: 0.7,
      browOuterUpRight: 0.7,
      eyeWideLeft: 0.6,
      eyeWideRight: 0.6,
      jawOpen: 0.6,
    }
    expect(classifyEmotion(surprised, {})).toBe('surprised')
  })

  test('ignores mouthPucker, which reads ~0.9 on a neutral face with this model', () => {
    expect(classifyEmotion({ mouthPucker: 0.95 }, {})).toBe('neutral')
  })

  test('ignores the eyeSquint resting level', () => {
    expect(classifyEmotion({ eyeSquintLeft: 0.5, eyeSquintRight: 0.5 }, {})).toBe('neutral')
  })
})
