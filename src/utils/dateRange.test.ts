import { expect, test } from 'vitest'

import { endOfLocalDayIso, isRangeReversed, startOfLocalDayIso } from './dateRange'

/**
 * Chốt cái bẫy múi giờ của bộ lọc lịch sử. new Date('2026-10-20') được spec
 * hiểu là 00:00 UTC, nên nếu dùng nó thì người ở UTC+7 lọc "từ ngày 20" sẽ nhặt
 * thêm 7 giờ cuối của ngày 19. Hai test dưới đây kiểm chính cái đó mà không phụ
 * thuộc vào múi giờ của máy chạy test: chúng đọc lại mốc ISO theo giờ địa
 * phương và đòi đúng 00:00 (hoặc 23:59:59.999) của ngày được chọn.
 */
test('đầu ngày là 00:00 giờ địa phương của đúng ngày đó', () => {
  const iso = startOfLocalDayIso('2026-10-20')
  expect(iso).not.toBeNull()

  const instant = new Date(iso!)
  expect(instant.getFullYear()).toBe(2026)
  expect(instant.getMonth()).toBe(9)
  expect(instant.getDate()).toBe(20)
  expect([instant.getHours(), instant.getMinutes(), instant.getSeconds()]).toEqual([0, 0, 0])
})

test('cuối ngày là mili giây cuối cùng của ngày, để mốc "đến ngày" tính cả ngày', () => {
  const iso = endOfLocalDayIso('2026-10-20')
  expect(iso).not.toBeNull()

  const instant = new Date(iso!)
  expect(instant.getDate()).toBe(20)
  expect([instant.getHours(), instant.getMinutes(), instant.getSeconds()]).toEqual([23, 59, 59])
  expect(instant.getMilliseconds()).toBe(999)
})

test.each(['', '2026-10-2', '20/10/2026', '2026-13-01', '2026-02-31'])(
  'trả null cho mốc không hợp lệ: "%s"',
  (value) => {
    expect(startOfLocalDayIso(value)).toBeNull()
    expect(endOfLocalDayIso(value)).toBeNull()
  },
)

test('chỉ coi là đảo chiều khi cả hai mốc đều có và từ ngày lớn hơn', () => {
  expect(isRangeReversed('2026-10-31', '2026-10-01')).toBe(true)
  expect(isRangeReversed('2026-10-01', '2026-10-31')).toBe(false)
  // Hai mốc trùng nhau là lọc đúng một ngày, hợp lệ.
  expect(isRangeReversed('2026-10-01', '2026-10-01')).toBe(false)
  expect(isRangeReversed('', '2026-10-01')).toBe(false)
  expect(isRangeReversed('2026-10-31', '')).toBe(false)
})
