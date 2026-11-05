/** Đổi số giây thành dạng mm:ss để hiện đồng hồ đếm ngược. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Hiện ngày theo định dạng Việt Nam, an toàn với chuỗi ISO không hợp lệ. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date)
}

/** Đổi số byte thành "412 KB" / "1,3 MB" cho người dùng đọc. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Đổi "2024-07" thành "07/2024". Không có giá trị nghĩa là còn đang diễn ra. */
export function formatYearMonth(value: string | null): string {
  if (!value) return 'Hiện tại'
  const [year, month] = value.split('-')
  return month ? `${month}/${year}` : (year ?? value)
}

/*
 * Ghép ngày và giờ bằng hai formatter chứ không gộp options vào một cái: locale
 * vi-VN xếp theo mẫu của nó và cho ra "15:14 20/10/2026", giờ đứng trước ngày.
 */
const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** Hiện cả ngày và giờ, để hai buổi phỏng vấn cùng ngày không trông giống nhau. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${DATE_FORMAT.format(date)} ${TIME_FORMAT.format(date)}`
}

/**
 * Thời lượng cho màn lịch sử. Khác formatDuration của đồng hồ đếm ngược ở hai
 * chỗ: null (buổi chưa nộp) ra dấu gạch chứ không phải 00:00, và quá một giờ
 * thì thêm cột giờ chứ không đếm tiếp tới 90 phút.
 */
export function formatDurationLabel(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '—'

  const seconds = Math.floor(totalSeconds % 60)
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  const pad = (value: number) => String(value).padStart(2, '0')

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

/** Điểm theo cách viết số của tiếng Việt: 7,5 chứ không phải 7.5. */
export function formatScore(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return '—'
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(score)
}
