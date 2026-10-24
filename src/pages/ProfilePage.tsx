import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ChangePasswordForm, ProfileIdentityCard, ProfileInfoForm } from '@/components/profile'
import { Button, PageHeader, Spinner, Stack } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import { userService } from '@/services/userService'
import type { UserProfile } from '@/types/user'
import { getErrorMessage } from '@/utils/apiError'

export function ProfilePage() {
  useDocumentTitle('Hồ sơ')
  const { user, applyProfile, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  /*
   * Trang tự đọc hồ sơ chứ không dùng phiên trong context: phiên chỉ giữ tên, email
   * và ảnh, còn ngày tham gia chỉ có trong hồ sơ đầy đủ. Đọc xong đồng bộ lại phiên
   * luôn, vì hồ sơ có thể đã bị sửa ở tab hay thiết bị khác.
   * applyProfile ổn định nên effect chỉ chạy lại khi bấm "Tải lại".
   */
  useEffect(() => {
    let ignore = false
    userService
      .getMyProfile()
      .then((loaded) => {
        if (ignore) return
        setProfile(loaded)
        applyProfile(loaded)
      })
      .catch((cause: unknown) => {
        if (!ignore) setLoadError(getErrorMessage(cause, 'Hãy thử lại sau ít phút.'))
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [applyProfile, retryCount])

  function reload() {
    setIsLoading(true)
    setLoadError('')
    setRetryCount((count) => count + 1)
  }

  function handleSaved(updated: UserProfile) {
    const emailChanged = profile !== null && profile.email !== updated.email
    setProfile(updated)
    applyProfile(updated)
    toast.success(
      'Đã lưu hồ sơ',
      emailChanged ? 'Từ lần sau hãy đăng nhập bằng email mới.' : undefined,
    )
  }

  function handleAvatarUploaded(avatarUrl: string) {
    if (!profile) return
    // Backend chỉ trả về URL ảnh, mọi field khác giữ nguyên nên không gọi lại GET.
    const updated: UserProfile = { ...profile, avatarUrl }
    setProfile(updated)
    applyProfile(updated)
    toast.success('Đã cập nhật ảnh đại diện')
  }

  async function handlePasswordChanged() {
    toast.success('Đã đổi mật khẩu', 'Hãy đăng nhập lại bằng mật khẩu mới.')
    try {
      await logout()
    } catch {
      // Backend đã thu hồi mọi refresh token nên lời gọi /auth/logout có lỗi cũng
      // không sao: logout() đã xoá phiên ở máy này trong finally.
    }
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Thông tin này dùng để đăng nhập và hiện trên báo cáo kết quả phỏng vấn."
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" label="Đang tải hồ sơ" />
        </div>
      ) : loadError || !profile ? (
        <Stack gap="sm">
          <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
            Chưa tải được hồ sơ: {loadError || 'Hãy thử lại sau ít phút.'}
          </p>
          <Button variant="secondary" className="self-start" onClick={reload}>
            Tải lại
          </Button>
        </Stack>
      ) : (
        <>
          <ProfileIdentityCard
            profile={profile}
            role={user?.role}
            onAvatarUploaded={handleAvatarUploaded}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <ProfileInfoForm profile={profile} onSaved={handleSaved} />
            <ChangePasswordForm onChanged={() => void handlePasswordChanged()} />
          </div>
        </>
      )}
    </Stack>
  )
}
