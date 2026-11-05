import { STORAGE_KEYS } from '@/constants'
import { OTP_RESEND_COOLDOWN_SECONDS, PENDING_REGISTRATION_TTL_MS } from '@/constants/auth'
import type { PendingRegistration } from '@/types/auth'
import { storage } from '@/utils/storage'

/**
 * Đăng ký đang chờ nhập OTP. Lưu ở localStorage để F5 trang xác nhận
 * hay quay lại sửa thông tin đều không phải gõ lại. Không lưu mật khẩu:
 * backend đã giữ bản hash, bước xác nhận chỉ cần email + OTP.
 */
export const pendingRegistration = {
  /** Trả null nếu chưa có hoặc backend đã xoá (quá 15 phút). */
  read(): PendingRegistration | null {
    const pending = storage.get<PendingRegistration>(STORAGE_KEYS.pendingRegistration)
    if (!pending) return null
    if (pending.expiresAt <= Date.now()) {
      storage.remove(STORAGE_KEYS.pendingRegistration)
      return null
    }
    return pending
  },

  /** Gọi sau khi backend nhận đăng ký và đã gửi OTP. */
  start(email: string, fullName: string): void {
    const now = Date.now()
    storage.set(STORAGE_KEYS.pendingRegistration, {
      email,
      fullName,
      otpSentAt: now,
      expiresAt: now + PENDING_REGISTRATION_TTL_MS,
    } satisfies PendingRegistration)
  },

  /** Gửi lại OTP không gia hạn đăng ký, chỉ dời mốc tính thời gian chờ. */
  markOtpResent(): void {
    const pending = pendingRegistration.read()
    if (!pending) return
    storage.set(STORAGE_KEYS.pendingRegistration, { ...pending, otpSentAt: Date.now() })
  },

  clear(): void {
    storage.remove(STORAGE_KEYS.pendingRegistration)
  },

  /** Số giây còn phải chờ trước khi được gửi lại OTP. */
  secondsUntilResend(pending: PendingRegistration): number {
    const elapsedSeconds = (Date.now() - pending.otpSentAt) / 1000
    return Math.max(0, Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds))
  },
}
