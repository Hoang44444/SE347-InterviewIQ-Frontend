import { useState, type ChangeEvent, type FormEvent } from 'react'

import { Button, Card, Input, Stack } from '@/components/ui'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/constants/auth'
import { authService } from '@/services/authService'
import { getErrorMessage, isApiError } from '@/utils/apiError'

type FormField = 'currentPassword' | 'newPassword' | 'confirmPassword'
type FormValues = Record<FormField, string>
type FieldErrors = Partial<Record<FormField, string>>

/** Đúng thứ tự trên form, để đưa con trỏ tới ô lỗi đầu tiên. */
const FIELD_ORDER: FormField[] = ['currentPassword', 'newPassword', 'confirmPassword']

const fieldId = (field: FormField) => `password-${field}`

/**
 * Cùng luật với ChangePasswordDto của backend. Ô nhập lại chỉ có ở FE:
 * backend không biết đến confirmPassword.
 */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.currentPassword) {
    errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
  } else if (values.currentPassword.length > PASSWORD_MAX_LENGTH) {
    errors.currentPassword = `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự`
  }

  if (!values.newPassword) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới'
  } else if (values.newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Mật khẩu mới tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`
  } else if (values.newPassword.length > PASSWORD_MAX_LENGTH) {
    errors.newPassword = `Mật khẩu mới tối đa ${PASSWORD_MAX_LENGTH} ký tự`
  } else if (values.newPassword === values.currentPassword) {
    // Backend cũng chặn: đặt lại đúng mật khẩu cũ thì mọi phiên bị đá ra mà chẳng được gì.
    errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại'
  }

  if (!errors.newPassword && values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Mật khẩu nhập lại không khớp'
  }

  return errors
}

export interface ChangePasswordFormProps {
  /** Gọi sau khi backend đổi xong. Trang sẽ xoá phiên vì mọi thiết bị đã bị đăng xuất. */
  onChanged: () => void
}

/** Đổi mật khẩu khi đang đăng nhập. Gọi POST /auth/password/change. */
export function ChangePasswordForm({ onChanged }: ChangePasswordFormProps) {
  const [values, setValues] = useState<FormValues>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(field: FormField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }))
      // Sửa ô nào thì gỡ lỗi của ô đó, các ô khác giữ nguyên.
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
      setFormError('')
    }
  }

  function showFieldErrors(errors: FieldErrors) {
    setFieldErrors(errors)
    const firstInvalid = FIELD_ORDER.find((field) => errors[field])
    if (firstInvalid) document.getElementById(fieldId(firstInvalid))?.focus()
  }

  function handleError(cause: unknown) {
    /*
     * 401 ở đây KHÔNG phải phiên hết hạn mà là sai mật khẩu hiện tại — apiClient
     * đã bỏ qua mọi 401 của /auth/* nên phiên không bị xoá oan.
     */
    if (isApiError(cause) && cause.status === 401) {
      setValues((prev) => ({ ...prev, currentPassword: '' }))
      showFieldErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' })
      return
    }
    if (isApiError(cause) && cause.status === 400) {
      showFieldErrors({ newPassword: 'Mật khẩu mới không hợp lệ' })
      return
    }
    setFormError(getErrorMessage(cause, 'Không đổi được mật khẩu. Vui lòng thử lại.'))
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
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      onChanged()
    } catch (cause) {
      handleError(cause)
      setIsSubmitting(false)
    }
  }

  return (
    <Card padding="lg">
      <Stack gap="md">
        <div>
          <h2 className="font-semibold text-content">Mật khẩu</h2>
          <p className="mt-1 text-sm text-content-muted">
            Đổi mật khẩu sẽ đăng xuất khỏi toàn bộ thiết bị, kể cả máy này.
          </p>
        </div>

        {/* noValidate: tự báo lỗi dưới từng ô cho đồng bộ, không dùng bong bóng của trình duyệt. */}
        <form noValidate onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              id={fieldId('currentPassword')}
              label="Mật khẩu hiện tại"
              type="password"
              autoComplete="current-password"
              required
              value={values.currentPassword}
              onChange={handleChange('currentPassword')}
              error={fieldErrors.currentPassword}
            />
            <Input
              id={fieldId('newPassword')}
              label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
              required
              value={values.newPassword}
              onChange={handleChange('newPassword')}
              error={fieldErrors.newPassword}
              hint={`Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`}
            />
            <Input
              id={fieldId('confirmPassword')}
              label="Nhập lại mật khẩu mới"
              type="password"
              autoComplete="new-password"
              required
              value={values.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={fieldErrors.confirmPassword}
            />

            {formError && (
              <p
                role="alert"
                className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700"
              >
                {formError}
              </p>
            )}

            <Button type="submit" isLoading={isSubmitting} className="self-start">
              Đổi mật khẩu
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  )
}
