import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom'

import { Button, Input, Stack } from '@/components/ui'
import { EMAIL_PATTERN, PASSWORD_MAX_LENGTH } from '@/constants/auth'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import { getErrorMessage, isApiError } from '@/utils/apiError'

type FormField = 'email' | 'password'
type FormValues = Record<FormField, string>
type FieldErrors = Partial<Record<FormField, string>>

/** Đúng thứ tự trên form, để đưa con trỏ tới ô lỗi đầu tiên. */
const FIELD_ORDER: FormField[] = ['email', 'password']

/**
 * Message validation của backend là tiếng Anh, chỉ dùng tên field để biết ô nào sai.
 * Các lỗi thường gặp đã được validate() bắt trước khi gửi.
 */
const SERVER_FIELD_ERRORS: Record<FormField, string> = {
  email: 'Email không đúng định dạng',
  password: 'Mật khẩu không hợp lệ',
}

const fieldId = (field: FormField) => `login-${field}`

/**
 * Cùng luật với LoginDto của backend. Không kiểm độ dài tối thiểu của mật khẩu:
 * đó là luật lúc đăng ký, màn đăng nhập không nhắc lại chính sách mật khẩu.
 */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  const email = values.email.trim()

  if (!email) {
    errors.email = 'Vui lòng nhập email'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Email không đúng định dạng'
  }

  if (!values.password) {
    errors.password = 'Vui lòng nhập mật khẩu'
  } else if (values.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự`
  }

  return errors
}

function pickFieldErrors(errors: Record<string, string[]> | undefined): FieldErrors {
  const result: FieldErrors = {}
  for (const field of FIELD_ORDER) {
    if (errors?.[field]?.length) result[field] = SERVER_FIELD_ERRORS[field]
  }
  return result
}

export function LoginPage() {
  useDocumentTitle('Đăng nhập')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [values, setValues] = useState<FormValues>({ email: '', password: '' })
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
    // Backend cố tình trả cùng một lỗi cho sai email và sai mật khẩu,
    // để không ai dò được email nào đã đăng ký.
    if (isApiError(error) && error.status === 401) {
      setFormError('Email hoặc mật khẩu không đúng.')
      setValues((prev) => ({ ...prev, password: '' }))
      document.getElementById(fieldId('password'))?.focus()
      return
    }
    if (isApiError(error) && error.status === 400) {
      const serverErrors = pickFieldErrors(error.errors)
      if (Object.keys(serverErrors).length > 0) {
        showFieldErrors(serverErrors)
        return
      }
    }
    setFormError(getErrorMessage(error, 'Không thể đăng nhập lúc này. Vui lòng thử lại.'))
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
      await login({ email: values.email.trim().toLowerCase(), password: values.password })
      toast.success('Đăng nhập thành công')
      // Quay lại trang người dùng định vào trước khi bị chặn (kể cả khi phiên vừa hết hạn).
      const from = (location.state as { from?: Location } | null)?.from
      navigate(from ?? ROUTES.dashboard, { replace: true })
    } catch (error) {
      handleError(error)
      setIsSubmitting(false)
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <h1 className="text-xl font-semibold text-content">Đăng nhập</h1>
        <p className="mt-1 text-sm text-content-muted">
          Tiếp tục hành trình luyện phỏng vấn của bạn.
        </p>
      </div>

      {/* noValidate: tự báo lỗi dưới từng ô cho đồng bộ, không dùng bong bóng của trình duyệt. */}
      <form noValidate onSubmit={handleSubmit}>
        <Stack gap="md">
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
            autoComplete="current-password"
            required
            value={values.password}
            onChange={handleChange('password')}
            error={fieldErrors.password}
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
            Đăng nhập
          </Button>
        </Stack>
      </form>

      <p className="text-center text-sm text-content-muted">
        Chưa có tài khoản?{' '}
        <Link to={ROUTES.register} className="font-medium text-brand-600 hover:underline">
          Đăng ký
        </Link>
      </p>
    </Stack>
  )
}
