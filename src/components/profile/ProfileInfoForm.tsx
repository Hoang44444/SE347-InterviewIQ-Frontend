import { useState, type ChangeEvent, type FormEvent } from 'react'

import { Button, Card, Input, Stack } from '@/components/ui'
import { EMAIL_PATTERN, FULL_NAME_MAX_LENGTH } from '@/constants/auth'
import { EMAIL_MAX_LENGTH } from '@/constants/user'
import { userService } from '@/services/userService'
import type { UpdateProfilePayload, UserProfile } from '@/types/user'
import { getErrorMessage, isApiError } from '@/utils/apiError'

type FormField = 'fullName' | 'email'
type FormValues = Record<FormField, string>
type FieldErrors = Partial<Record<FormField, string>>

/** Đúng thứ tự trên form, để đưa con trỏ tới ô lỗi đầu tiên. */
const FIELD_ORDER: FormField[] = ['fullName', 'email']

/** Message validation của backend là tiếng Anh, chỉ dùng tên field để biết ô nào sai. */
const SERVER_FIELD_ERRORS: Record<FormField, string> = {
  fullName: 'Họ tên không hợp lệ',
  email: 'Email không đúng định dạng',
}

const fieldId = (field: FormField) => `profile-${field}`

/** Cùng luật với UpdateUserProfileRequestDto của backend. */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  const fullName = values.fullName.trim()
  const email = values.email.trim()

  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ tên'
  } else if (fullName.length > FULL_NAME_MAX_LENGTH) {
    errors.fullName = `Họ tên tối đa ${FULL_NAME_MAX_LENGTH} ký tự`
  }

  if (!email) {
    errors.email = 'Vui lòng nhập email'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Email không đúng định dạng'
  } else if (email.length > EMAIL_MAX_LENGTH) {
    errors.email = `Email tối đa ${EMAIL_MAX_LENGTH} ký tự`
  }

  return errors
}

/**
 * Chỉ những ô thật sự khác hồ sơ hiện tại. So sánh sau khi chuẩn hoá y như backend
 * (trim, email về chữ thường) để thêm một dấu cách không bị tính là thay đổi.
 */
function changedFields(values: FormValues, profile: UserProfile): UpdateProfilePayload {
  const payload: UpdateProfilePayload = {}
  const fullName = values.fullName.trim()
  const email = values.email.trim().toLowerCase()

  if (fullName !== profile.fullName) payload.fullName = fullName
  if (email !== profile.email) payload.email = email
  return payload
}

function pickFieldErrors(errors: Record<string, string[]> | undefined): FieldErrors {
  const result: FieldErrors = {}
  for (const field of FIELD_ORDER) {
    if (errors?.[field]?.length) result[field] = SERVER_FIELD_ERRORS[field]
  }
  return result
}

export interface ProfileInfoFormProps {
  profile: UserProfile
  /** Gọi với hồ sơ backend vừa trả về sau khi lưu thành công. */
  onSaved: (profile: UserProfile) => void
}

/** Sửa họ tên và email. PATCH /users/me chỉ nhận hai field này. */
export function ProfileInfoForm({ profile, onSaved }: ProfileInfoFormProps) {
  const [values, setValues] = useState<FormValues>({
    fullName: profile.fullName,
    email: profile.email,
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
    if (isApiError(cause) && cause.status === 409) {
      showFieldErrors({ email: 'Email này đã có người khác dùng' })
      return
    }
    if (isApiError(cause) && cause.status === 400) {
      const serverErrors = pickFieldErrors(cause.errors)
      if (Object.keys(serverErrors).length > 0) {
        showFieldErrors(serverErrors)
        return
      }
    }
    setFormError(getErrorMessage(cause, 'Không lưu được hồ sơ. Vui lòng thử lại.'))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const errors = validate(values)
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors)
      return
    }

    // Backend trả 400 khi body không có field nào, nên không gửi lúc chưa sửa gì.
    const payload = changedFields(values, profile)
    if (Object.keys(payload).length === 0) {
      setFormError('Bạn chưa thay đổi thông tin nào.')
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await userService.updateMyProfile(payload)
      // Lấy lại giá trị đã chuẩn hoá của backend, để lần lưu sau so sánh đúng.
      setValues({ fullName: updated.fullName, email: updated.email })
      onSaved(updated)
    } catch (cause) {
      handleError(cause)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card padding="lg">
      <Stack gap="md">
        <div>
          <h2 className="font-semibold text-content">Thông tin cá nhân</h2>
          <p className="mt-1 text-sm text-content-muted">
            Họ tên hiện trong phòng phỏng vấn và trên báo cáo kết quả.
          </p>
        </div>

        {/* noValidate: tự báo lỗi dưới từng ô cho đồng bộ, không dùng bong bóng của trình duyệt. */}
        <form noValidate onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              id={fieldId('fullName')}
              label="Họ tên"
              autoComplete="name"
              required
              maxLength={FULL_NAME_MAX_LENGTH}
              value={values.fullName}
              onChange={handleChange('fullName')}
              error={fieldErrors.fullName}
            />
            <Input
              id={fieldId('email')}
              label="Email"
              type="email"
              autoComplete="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              value={values.email}
              onChange={handleChange('email')}
              error={fieldErrors.email}
              hint="Đổi email là đổi luôn email dùng để đăng nhập."
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
              Lưu thay đổi
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  )
}
