/**
 * Đổi mốc ngày của <input type="date"> sang ISO 8601 cho backend.
 *
 * Đây là chỗ dễ sai nhất của bộ lọc. Ô date trả về "2026-10-20" theo lịch người
 * dùng đang xem, còn backend lọc theo mốc thời gian tuyệt đối. Gửi thẳng chuỗi
 * đó đi thì nó được hiểu là 00:00 UTC: người ở giờ Việt Nam (UTC+7) lọc "đến
 * ngày 20" sẽ mất gần hết ngày 20, và lọc "từ ngày 20" lại nhặt thêm 7 giờ cuối
 * của ngày 19. Nên phải quy đổi: từ ngày = đầu ngày địa phương, đến ngày = cuối
 * ngày địa phương, rồi mới .toISOString().
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Dựng Date ở giờ địa phương từ "yyyy-MM-dd".
 * Không dùng new Date(value): chuỗi chỉ-có-ngày được spec định nghĩa là UTC,
 * đúng cái bẫy mô tả ở trên.
 */
function parseLocalDate(
  value: string,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number,
) {
  const parts = DATE_PATTERN.exec(value)
  if (!parts) return null

  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  const date = new Date(year, month - 1, day, hours, minutes, seconds, ms)

  // Chặn ngày không tồn tại: new Date(2026, 1, 31) tự nhảy sang 03/03.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

/** 00:00:00.000 giờ địa phương của ngày đó, dạng ISO. null nếu chuỗi không hợp lệ. */
export function startOfLocalDayIso(value: string): string | null {
  return parseLocalDate(value, 0, 0, 0, 0)?.toISOString() ?? null
}

/**
 * 23:59:59.999 giờ địa phương của ngày đó, dạng ISO. null nếu chuỗi không hợp lệ.
 * Backend lọc createdAt <= toDate và bao gồm chính mốc này, nên lấy mili giây
 * cuối cùng của ngày để cả ngày được tính vào.
 */
export function endOfLocalDayIso(value: string): string | null {
  return parseLocalDate(value, 23, 59, 59, 999)?.toISOString() ?? null
}

/**
 * Hai mốc có bị đảo chiều không. So sánh thẳng chuỗi yyyy-MM-dd được vì định
 * dạng này sắp xếp theo thứ tự chữ cái trùng với thứ tự thời gian.
 */
export function isRangeReversed(fromDate: string, toDate: string): boolean {
  return fromDate !== '' && toDate !== '' && fromDate > toDate
}
