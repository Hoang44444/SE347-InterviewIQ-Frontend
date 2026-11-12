/**
 * Lỗi nào đáng gửi lại cheat log. Chỉ lỗi tạm thời: status 0 (mất mạng, timeout),
 * 429 và 5xx. Các 4xx còn lại (occurredAt ngoài khoảng, 404, 409 quá cửa sổ) gửi
 * lại cũng thất bại nên bỏ ngay.
 */
export function isRetryableCheatLogError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status
  if (typeof status !== 'number') return false
  return status === 0 || status === 429 || status >= 500
}
