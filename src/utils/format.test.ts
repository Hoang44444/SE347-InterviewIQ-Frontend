import { expect, test } from 'vitest'

import { formatFileSize, formatYearMonth } from './format'

test('formatFileSize uses KB below 1 MB and MB with a comma above', () => {
  expect(formatFileSize(412_000)).toBe('402 KB')
  expect(formatFileSize(5 * 1024 * 1024)).toBe('5,0 MB')
  expect(formatFileSize(1_280_000)).toBe('1,2 MB')
})

test('formatFileSize never shows 0 KB for a tiny file', () => {
  expect(formatFileSize(10)).toBe('1 KB')
})

test('formatYearMonth flips YYYY-MM and treats null as still ongoing', () => {
  expect(formatYearMonth('2024-07')).toBe('07/2024')
  expect(formatYearMonth('2024')).toBe('2024')
  expect(formatYearMonth(null)).toBe('Hiện tại')
})
