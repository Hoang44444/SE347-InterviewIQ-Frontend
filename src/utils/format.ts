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
