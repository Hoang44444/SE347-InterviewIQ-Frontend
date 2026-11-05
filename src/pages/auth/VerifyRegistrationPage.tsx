import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { OtpInput, RegisterSteps } from '@/components/auth'
import { Button, Stack } from '@/components/ui'
import { APP_NAME } from '@/constants'
import {
  AUTH_ERROR_MESSAGES,
  OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MINUTES,
} from '@/constants/auth'
import { useAuth } from '@/hooks/useAuth'
import { useCountdown } from '@/hooks/useCountdown'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import { authService } from '@/services/authService'
import { getErrorMessage, isApiError } from '@/utils/apiError'
import { formatDuration } from '@/utils/format'
import { pendingRegistration } from '@/utils/pendingRegistration'

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 7l8.5 6 8.5-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function VerifyRegistrationPage() {
  useDocumentTitle('Xác nhận email')
  const { verifyRegistration } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  // Đọc một lần lúc vào trang. Null nghĩa là vào thẳng bằng link hoặc đăng ký đã hết hạn.
  const [pending] = useState(() => pendingRegistration.read())
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const otpRef = useRef<HTMLInputElement>(null)

  // F5 giữa chừng thì chờ tiếp phần còn lại, không cho gửi sớm rồi ăn lỗi 429.
  const [initialCooldown] = useState(() =>
    pending ? pendingRegistration.secondsUntilResend(pending) : 0,
  )
  const cooldown = useCountdown(initialCooldown, { autoStart: true })

  // Ô OTP bị khoá trong lúc chờ API nên mất focus; có lỗi thì trả focus để gõ lại ngay.
  useEffect(() => {
    if (error && !isVerifying) otpRef.current?.focus()
  }, [error, isVerifying])

  if (!pending) return <Navigate to={ROUTES.register} replace />

  const restartRegistration = () => {
    pendingRegistration.clear()
    toast.warning('Phiên đăng ký đã hết hạn', 'Vui lòng điền lại thông tin để nhận mã mới.')
    navigate(ROUTES.register, { replace: true })
  }

  const handleVerifyError = (err: unknown) => {
    setOtp('')

    if (isApiError(err) && err.message === AUTH_ERROR_MESSAGES.registrationExpired) {
      restartRegistration()
      return
    }
    // Tài khoản đã được tạo, chỉ bước tự đăng nhập bị lỗi: xác nhận lại sẽ báo sai OTP.
    if (isApiError(err) && err.message === AUTH_ERROR_MESSAGES.autoLoginFailed) {
      pendingRegistration.clear()
      toast.success('Tạo tài khoản thành công', 'Vui lòng đăng nhập để tiếp tục.')
      navigate(ROUTES.login, { replace: true })
      return
    }
    if (isApiError(err) && err.status === 409) {
      pendingRegistration.clear()
      toast.info('Email này đã có tài khoản', 'Vui lòng đăng nhập để tiếp tục.')
      navigate(ROUTES.login, { replace: true })
      return
    }
    // Sai quá 5 lần: backend đã xoá mã nên được gửi lại ngay, không phải chờ.
    if (isApiError(err) && err.status === 429) {
      cooldown.reset(0)
      setError('Bạn đã nhập sai quá nhiều lần. Hãy gửi lại mã mới.')
      return
    }
    if (isApiError(err) && err.status === 400) {
      setError('Mã không đúng hoặc đã hết hạn.')
      return
    }
    setError(getErrorMessage(err, 'Không thể xác nhận lúc này. Vui lòng thử lại.'))
  }

  const submit = async (code: string) => {
    setError('')
    setIsVerifying(true)
    try {
      await verifyRegistration({ email: pending.email, otp: code }, pending.fullName)
      pendingRegistration.clear()
      toast.success(
        'Tạo tài khoản thành công',
        `Chào mừng ${pending.fullName} đến với ${APP_NAME}.`,
      )
      navigate(ROUTES.dashboard, { replace: true })
    } catch (err) {
      handleVerifyError(err)
      setIsVerifying(false)
    }
  }

  const handleOtpChange = (next: string) => {
    setOtp(next)
    if (error) setError('')
    // Nhập hoặc dán đủ 6 số thì tự xác nhận, khỏi phải bấm nút.
    if (next.length === OTP_LENGTH && otp.length !== OTP_LENGTH) void submit(next)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (otp.length === OTP_LENGTH && !isVerifying) void submit(otp)
  }

  const handleResend = async () => {
    setError('')
    setIsResending(true)
    try {
      await authService.resendRegistrationOtp(pending.email)
      pendingRegistration.markOtpResent()
      cooldown.reset(OTP_RESEND_COOLDOWN_SECONDS, true)
      setOtp('')
      otpRef.current?.focus()
      toast.success('Đã gửi mã mới', `Kiểm tra hộp thư ${pending.email}.`)
    } catch (err) {
      if (isApiError(err) && err.message === AUTH_ERROR_MESSAGES.registrationExpired) {
        restartRegistration()
        return
      }
      // Mã vừa được gửi từ nơi khác (tab khác chẳng hạn): chờ trọn một lượt cho chắc.
      if (isApiError(err) && err.status === 429) {
        cooldown.reset(OTP_RESEND_COOLDOWN_SECONDS, true)
        setError('Mã vừa được gửi gần đây. Vui lòng đợi rồi thử lại.')
        return
      }
      setError(getErrorMessage(err, 'Không gửi lại được mã. Vui lòng thử lại.'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Stack gap="lg">
      <RegisterSteps current={2} />

      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailIcon />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-content">Xác nhận email</h1>
        <p className="mt-1 text-sm text-content-muted">
          Nhập mã {OTP_LENGTH} số vừa được gửi tới{' '}
          <span className="font-medium break-all text-content">{pending.email}</span>. Mã có hiệu
          lực trong {OTP_TTL_MINUTES} phút.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit}>
        <Stack gap="md">
          <OtpInput
            ref={otpRef}
            label={`Mã xác nhận ${OTP_LENGTH} số`}
            value={otp}
            onChange={handleOtpChange}
            error={error || undefined}
            disabled={isVerifying}
            autoFocus
          />
          <Button
            type="submit"
            isLoading={isVerifying}
            disabled={otp.length !== OTP_LENGTH}
            fullWidth
          >
            Xác nhận và tạo tài khoản
          </Button>
        </Stack>
      </form>

      <div className="flex flex-col items-center gap-2 text-center text-sm text-content-muted">
        <p>
          Không thấy email? Kiểm tra cả thư mục Spam, hoặc{' '}
          {cooldown.secondsLeft > 0 ? (
            <span>
              gửi lại sau{' '}
              <span className="font-medium text-content tabular-nums">
                {formatDuration(cooldown.secondsLeft)}
              </span>
            </span>
          ) : (
            <Button
              variant="link"
              size="sm"
              isLoading={isResending}
              onClick={handleResend}
              className="h-auto px-0 align-baseline"
            >
              gửi lại mã
            </Button>
          )}
          .
        </p>
        <p>
          Nhập sai email?{' '}
          <Link to={ROUTES.register} className="font-medium text-brand-600 hover:underline">
            Quay lại sửa
          </Link>
        </p>
      </div>
    </Stack>
  )
}
