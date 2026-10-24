/** Các claim backend ký vào access token (xem JwtAccessTokenIssuer). */
export interface AccessTokenClaims {
  sub: string
  role: string
}

/**
 * Đọc phần payload của JWT. Không kiểm chữ ký: việc đó là của backend,
 * FE chỉ cần biết token thuộc về ai để hiển thị.
 * Trả null nếu token sai định dạng hoặc thiếu claim.
 */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    // JWT dùng base64url: đổi lại bảng chữ base64 thường rồi mới atob được.
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (typeof claims !== 'object' || claims === null) return null

    const { sub, role } = claims as Record<string, unknown>
    if (typeof sub !== 'string' || typeof role !== 'string') return null
    return { sub, role }
  } catch {
    return null
  }
}
