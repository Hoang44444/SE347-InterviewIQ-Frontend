import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { RegisterSteps } from '@/components/auth'
import { Button, Input, Stack } from '@/components/ui'
import {
  FULL_NAME_MAX_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/constants/auth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ROUTES } from '@/routes/paths'
import { authService } from '@/services/authService'
import { getErrorMessage, isApiError } from '@/utils/apiError'
import { pendingRegistration } from '@/utils/pendingRegistration'

type FormField = 'fullName' | 'email' | 'password' | 'confirm'
type FormValues = Record<FormField, string>
type FieldErrors = Partial<Record<FormField, string>>

/** Đúng thứ tự trên form, để đưa con trỏ tới ô lỗi đầu tiên. */
const FIELD_ORDER: FormField[] = ['fullName', 'email', 'password', 'confirm']

/** Chỉ bắt lỗi gõ nhầm. Backend kiểm tra lại bằng IsEmail. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fieldId = (field: FormField) => `register-${field}`

/** Cùng luật với RegisterDto của backend, để báo lỗi ngay chứ không đợi gửi lên. */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  const fullName = values.fullName.trim()
  const email = values.email.trim()

  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ và tên'
  } else if (fullName.length > FULL_NAME_MAX_LENGTH) {
    errors.fullName = `Họ và tên tối đa ${FULL_NAME_MAX_LENGTH} ký tự`
  }

  if (!email) {
    errors.email = 'Vui lòng nhập email'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Email không đúng định dạng'
  }

  if (!values.password) {
    errors.password = 'Vui lòng nhập mật khẩu'
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự`
  } else if (values.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự`
  }

  if (!values.confirm) {
    errors.confirm = 'Vui lòng nhập lại mật khẩu'
  } else if (values.confirm !== values.password) {
    errors.confirm = 'Mật khẩu nhập lại không khớp'
  }

  return errors
}

/** Backend báo lỗi theo tên field của DTO, trùng tên field trên form. */
function pickFieldErrors(errors: Record<string, string[]> | undefined): FieldErrors {
  const result: FieldErrors = {}
  for (const field of FIELD_ORDER) {
    const message = errors?.[field]?.[0]
    if (message) result[field] = message
  }
  return result
}

export function RegisterPage() {
  useDocumentTitle('Đăng ký')
  const navigate = useNavigate()

  // Quay lại từ bước xác nhận để sửa thì điền sẵn những gì đã nhập, trừ mật khẩu.
  const [values, setValues] = useState<FormValues>(() => {
    const pending = pendingRegistration.read()
    return {
      fullName: pending?.fullName ?? '',
      email: pending?.email ?? '',
      password: '',
      confirm: '',
    }
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(field: FormField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }))
      // Sửa ô nào thì gỡ lỗi của ô đó, các ô khác giữ nguyên.
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function showFieldErrors(errors: FieldErrors) {
    setFieldErrors(errors)
    const firstInvalid = FIELD_ORDER.find((field) => errors[field])
    if (firstInvalid) document.getElementById(fieldId(firstInvalid))?.focus()
  }

  function handleError(error: unknown) {
    if (isApiError(error) && error.status === 409) {
      showFieldErrors({ email: 'Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác.' })
      return
    }
    // Backend không ghi đè đăng ký đang chờ khi còn trong thời gian chờ gửi lại OTP.
    if (isApiError(error) && error.status === 429) {
      setFormError(
        `Mã xác nhận vừa được gửi tới email này. Vui lòng đợi tối đa ${OTP_RESEND_COOLDOWN_SECONDS} giây rồi thử lại.`,
      )
      return
    }
    if (isApiError(error) && error.status === 400) {
      const serverErrors = pickFieldErrors(error.errors)
      if (Object.keys(serverErrors).length > 0) {
        showFieldErrors(serverErrors)
        return
      }
    }
    setFormError(getErrorMessage(error, 'Không thể đăng ký lúc này. Vui lòng thử lại.'))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const errors = validate(values)
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const fullName = values.fullName.trim()
      const { email } = await authService.register({
        fullName,
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      pendingRegistration.start(email, fullName)
      navigate(ROUTES.registerVerify)
    } catch (error) {
      handleError(error)
      setIsSubmitting(false)
    }
  }

  return (
    <Stack gap="lg">
      <RegisterSteps current={1} />

      <div>
        <h1 className="text-xl font-semibold text-content">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-content-muted">
          Miễn phí. Chúng tôi sẽ gửi mã xác nhận tới email của bạn.
        </p>
      </div>

      {/* noValidate: tự báo lỗi dưới từng ô cho đồng bộ, không dùng bong bóng của trình duyệt. */}
      <form noValidate onSubmit={handleSubmit}>
        <Stack gap="md">
          <Input
            id={fieldId('fullName')}
            label="Họ và tên"
            autoComplete="name"
            required
            value={values.fullName}
            onChange={handleChange('fullName')}
            error={fieldErrors.fullName}
            placeholder="Nguyễn Văn A"
          />
          <Input
            id={fieldId('email')}
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={handleChange('email')}
            error={fieldErrors.email}
            placeholder="ban@example.com"
          />
          <Input
            id={fieldId('password')}
            label="Mật khẩu"
            type="password"
            autoComplete="new-password"
            required
            hint={`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự`}
            value={values.password}
            onChange={handleChange('password')}
            error={fieldErrors.password}
          />
          <Input
            id={fieldId('confirm')}
            label="Nhập lại mật khẩu"
            type="password"
            autoComplete="new-password"
            required
            value={values.confirm}
            onChange={handleChange('confirm')}
            error={fieldErrors.confirm}
          />

          {formError && (
            <p
              role="alert"
              className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700"
            >
              {formError}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} fullWidth className="mt-2">
            Gửi mã xác nhận
          </Button>
        </Stack>
      </form>

      <p className="text-center text-sm text-content-muted">
        Đã có tài khoản?{' '}
        <Link to={ROUTES.login} className="font-medium text-brand-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </Stack>
  )
}
