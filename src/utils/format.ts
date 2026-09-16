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
