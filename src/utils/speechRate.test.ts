import { describe, expect, test } from 'vitest'

import {
  appendFinalSegment,
  calculateWpm,
  countWords,
  getPaceStatus,
  windowedWpm,
} from './speechRate'

describe('countWords', () => {
  test('splits Vietnamese text on whitespace', () => {
    expect(countWords('tôi  là\nlập trình\tviên')).toBe(5)
  })

  test('returns 0 for empty or blank text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n ')).toBe(0)
  })
})

describe('calculateWpm', () => {
  test('converts words and seconds to words per minute', () => {
    expect(calculateWpm(30, 15)).toBe(120)
  })

  test('returns null without elapsed time', () => {
    expect(calculateWpm(10, 0)).toBeNull()
    expect(calculateWpm(10, -1)).toBeNull()
  })
})

describe('getPaceStatus', () => {
  test.each([
    [89, 'slow'],
    [90, 'good'],
    [180, 'good'],
    [181, 'fast'],
  ] as const)('classifies %i wpm as %s with default thresholds', (wpm, expected) => {
    expect(getPaceStatus(wpm)).toBe(expected)
  })

  test('honours custom thresholds', () => {
    expect(getPaceStatus(100, { slow: 120 })).toBe('slow')
    expect(getPaceStatus(150, { fast: 140 })).toBe('fast')
  })

  test('returns null when speed is unknown', () => {
    expect(getPaceStatus(null)).toBeNull()
  })
})

describe('windowedWpm', () => {
  test('is null before the minimum listening time', () => {
    expect(windowedWpm([{ at: 3, totalWords: 10 }], 7, 10)).toBeNull()
  })

  test('divides by listened time while the window is not full', () => {
    expect(windowedWpm([], 10, 20)).toBe(120)
  })

  test('counts only the words added inside the last 15 seconds', () => {
    const snapshots = [
      { at: 5, totalWords: 50 },
      { at: 20, totalWords: 60 },
      { at: 30, totalWords: 90 },
    ]
    // Cửa sổ 15..30: baseline là snapshot tại giây 5 (50 từ) → 40 từ / 15 giây.
    expect(windowedWpm(snapshots, 30, 90)).toBe(160)
  })

  test('reports 0 after a long silence', () => {
    expect(windowedWpm([{ at: 5, totalWords: 40 }], 40, 40)).toBe(0)
  })

  test('never goes negative when interim text shrinks', () => {
    expect(windowedWpm([{ at: 1, totalWords: 30 }], 20, 20)).toBe(0)
  })
})

describe('appendFinalSegment', () => {
  test('joins segments with a single space', () => {
    expect(appendFinalSegment('xin chào', ' các bạn ')).toEqual({
      text: 'xin chào các bạn',
      truncated: false,
    })
  })

  test('ignores blank segments', () => {
    expect(appendFinalSegment('xin chào', '  ')).toEqual({ text: 'xin chào', truncated: false })
  })

  test('starts a transcript without a leading space', () => {
    expect(appendFinalSegment('', 'xin chào').text).toBe('xin chào')
  })

  test('cuts at the nearest word boundary when over the limit', () => {
    expect(appendFinalSegment('aaa bbb', 'cccc dddd', 14)).toEqual({
      text: 'aaa bbb cccc',
      truncated: true,
    })
  })

  test('keeps the whole word when the cut falls exactly on a boundary', () => {
    expect(appendFinalSegment('aaa bbb', 'cc dd', 10)).toEqual({
      text: 'aaa bbb cc',
      truncated: true,
    })
  })

  test('never exceeds the limit', () => {
    const result = appendFinalSegment('a'.repeat(40), 'b'.repeat(30), 50)
    expect(result.truncated).toBe(true)
    expect(result.text.length).toBeLessThanOrEqual(50)
  })
})
