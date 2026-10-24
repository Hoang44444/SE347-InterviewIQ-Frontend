import { useRef, useState } from 'react'

import { Avatar, Badge, Button, Card, Stack } from '@/components/ui'
import { USER_ROLE_LABEL } from '@/constants/auth'
import { AVATAR_ACCEPT, CLIENT_VALIDATION_CODE, MAX_AVATAR_BYTES } from '@/constants/user'
import { userService } from '@/services/userService'
import type { UserRole } from '@/types/auth'
import type { UserProfile } from '@/types/user'
import { getErrorMessage, isApiError } from '@/utils/apiError'
import { formatDate, formatFileSize } from '@/utils/format'

export interface ProfileIdentityCardProps {
  profile: UserProfile
  /** Vai trò đọc từ access token, không nằm trong hồ sơ backend trả về. */
  role?: UserRole
  /** Gọi sau khi backend đã lưu, kèm URL ảnh mới. */
  onAvatarUploaded: (avatarUrl: string) => void
}

/** Câu báo lỗi tiếng Việt cho từng nguyên nhân upload thất bại. */
function uploadErrorMessage(cause: unknown): string {
  // Lỗi userService tự kiểm trước khi gọi API: message đã là tiếng Việt.
  if (isApiError(cause) && cause.code === CLIENT_VALIDATION_CODE) return cause.message
  // 413: multer cắt ngang vì file quá lớn. 400: backend không nhận định dạng này.
  if (isApiError(cause) && (cause.status === 400 || cause.status === 413)) {
    return `Ảnh phải là JPEG, PNG hoặc WEBP và không quá ${formatFileSize(MAX_AVATAR_BYTES)}`
  }
  return getErrorMessage(cause, 'Không tải được ảnh lên. Hãy thử lại.')
}

/** Thẻ nhận diện ở đầu trang Hồ sơ: ảnh đại diện, tên, email, vai trò, ngày tham gia. */
export function ProfileIdentityCard({ profile, role, onAvatarUploaded }: ProfileIdentityCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    setIsUploading(true)
    try {
      onAvatarUploaded(await userService.uploadAvatar(file))
    } catch (cause) {
      setError(uploadErrorMessage(cause))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card padding="lg">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <Avatar src={profile.avatarUrl} name={profile.fullName} size="lg" />

        <Stack gap="xs" className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 className="text-xl font-semibold text-content">{profile.fullName}</h2>
            {role && <Badge tone="brand">{USER_ROLE_LABEL[role]}</Badge>}
          </div>
          <p className="truncate text-sm text-content-muted">{profile.email}</p>
          <p className="text-xs text-content-subtle">Tham gia từ {formatDate(profile.createdAt)}</p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Button
              variant="secondary"
              size="sm"
              isLoading={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {profile.avatarUrl ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện'}
            </Button>
            <span className="text-xs text-content-subtle">
              JPEG, PNG hoặc WEBP &middot; tối đa {formatFileSize(MAX_AVATAR_BYTES)}
            </span>
          </div>
        </Stack>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700"
        >
          {error}
        </p>
      )}

      {/* Input thật bị ẩn: nút Button bên trên mới là thứ người dùng thấy và bấm. */}
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        aria-label="Chọn ảnh đại diện"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
          // Reset để chọn lại đúng file vừa chọn vẫn kích hoạt onChange.
          event.target.value = ''
        }}
      />
    </Card>
  )
}
