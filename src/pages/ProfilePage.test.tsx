import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, test } from 'vitest'

import { ProfilePage } from './ProfilePage'

import { STORAGE_KEYS } from '@/constants'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ToastProvider } from '@/contexts/ToastProvider'
import { apiClient } from '@/services/apiClient'
import type { User } from '@/types/auth'
import type { UserProfile } from '@/types/user'
import { storage } from '@/utils/storage'

const profile: UserProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'hoang@example.com',
  fullName: 'Lê Hữu Việt Hoàng',
  avatarUrl: null,
  createdAt: '2026-01-05T08:30:00.000Z',
  updatedAt: '2026-02-11T03:15:42.000Z',
}

const session: User = { id: profile.id, role: 'USER', email: profile.email }

const avatarLabel = `Ảnh đại diện của ${profile.fullName}`

/** Lỗi đúng hình dạng AxiosError để response interceptor dựng được ApiError. */
function httpError(config: InternalAxiosRequestConfig, status: number, message: string) {
  return {
    isAxiosError: true,
    message,
    config,
    response: {
      status,
      statusText: '',
      headers: {},
      config,
      data: { statusCode: status, success: false, code: 'ERROR', message, path: '', timestamp: '' },
    },
  }
}

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

interface Backend {
  /** Trả hồ sơ, hoặc ném lỗi để thử nhánh tải thất bại. */
  getProfile?: (config: InternalAxiosRequestConfig) => UserProfile
  patchProfile?: (body: Record<string, string>, config: InternalAxiosRequestConfig) => UserProfile
  uploadAvatar?: () => { avatarUrl: string }
  changePassword?: (config: InternalAxiosRequestConfig) => null
}

/** Dựng trang với một backend giả, trả về danh sách request đã gửi. */
function setup(backend: Backend = {}) {
  storage.set(STORAGE_KEYS.accessToken, 'access-token')
  storage.set(STORAGE_KEYS.refreshToken, 'refresh-token')
  storage.set(STORAGE_KEYS.user, session)

  const requests: InternalAxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    const data =
      config.url === '/users/me' && config.method === 'get'
        ? (backend.getProfile ?? (() => profile))(config)
        : config.url === '/users/me' && config.method === 'patch'
          ? (backend.patchProfile ?? (() => profile))(
              JSON.parse(config.data) as Record<string, string>,
              config,
            )
          : config.url === '/users/me/avatar'
            ? (backend.uploadAvatar ?? (() => ({ avatarUrl: 'https://cdn.test/a.png' })))()
            : config.url === '/auth/password/change'
              ? (backend.changePassword ?? (() => null))(config)
              : null

    return {
      data: { statusCode: 200, success: true, data, message: 'OK', timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/profile']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<p>Trang đăng nhập</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )

  return requests
}

function requestsTo(requests: InternalAxiosRequestConfig[], url: string, method: string) {
  return requests.filter((request) => request.url === url && request.method === method)
}

/** Điền cả ba ô của form mật khẩu. */
function fillPasswordForm(current: string, next: string) {
  fireEvent.change(screen.getByLabelText(/^Mật khẩu hiện tại/), { target: { value: current } })
  fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: next } })
  fireEvent.change(screen.getByLabelText(/^Nhập lại mật khẩu mới/), { target: { value: next } })
}

test('shows the profile returned by the backend', async () => {
  setup()

  expect(await screen.findByRole('heading', { name: profile.fullName })).toBeInTheDocument()
  expect(screen.getByText('Người dùng')).toBeInTheDocument()
  expect(screen.getByText(/Tham gia từ/)).toBeInTheDocument()
  // Chưa có ảnh thì avatar lùi về chữ viết tắt.
  expect(screen.getByRole('img', { name: avatarLabel })).toHaveTextContent('LH')
  expect(screen.getByRole('textbox', { name: 'Họ tên' })).toHaveValue(profile.fullName)
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue(profile.email)
})

test('sends only the edited field and reports the save', async () => {
  const requests = setup({
    patchProfile: (body) => ({ ...profile, fullName: body.fullName ?? profile.fullName }),
  })
  await screen.findByRole('heading', { name: profile.fullName })

  fireEvent.change(screen.getByRole('textbox', { name: 'Họ tên' }), {
    target: { value: 'Việt Hoàng' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

  expect(await screen.findByText('Đã lưu hồ sơ')).toBeInTheDocument()
  // Email không sửa nên không được gửi: backend coi field vắng mặt là giữ nguyên.
  const patched = requestsTo(requests, '/users/me', 'patch')
  expect(JSON.parse(patched[0].data)).toEqual({ fullName: 'Việt Hoàng' })
  // Thanh điều hướng đọc tên từ phiên, nên phiên phải được cập nhật theo.
  await waitFor(() => expect(storage.get<User>(STORAGE_KEYS.user)?.fullName).toBe('Việt Hoàng'))
})

test('does not call the backend when nothing changed', async () => {
  const requests = setup()
  await screen.findByRole('heading', { name: profile.fullName })

  fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Bạn chưa thay đổi thông tin nào.')
  expect(requestsTo(requests, '/users/me', 'patch')).toHaveLength(0)
})

test('puts a taken email error on the email field', async () => {
  setup({
    patchProfile: (_body, config) => {
      throw httpError(config, 409, 'This email is already in use')
    },
  })
  await screen.findByRole('heading', { name: profile.fullName })

  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'daco@example.com' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Email này đã có người khác dùng')
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus()
})

test('uploads a new avatar and shows it right away', async () => {
  setup()
  await screen.findByRole('heading', { name: profile.fullName })

  fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện'), {
    target: { files: [new File(['x'], 'anh.png', { type: 'image/png' })] },
  })

  expect(await screen.findByText('Đã cập nhật ảnh đại diện')).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('img', { name: avatarLabel })).toHaveAttribute(
      'src',
      'https://cdn.test/a.png',
    ),
  )
})

test('refuses a file that is not an image without calling the backend', async () => {
  const requests = setup()
  await screen.findByRole('heading', { name: profile.fullName })

  fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện'), {
    target: { files: [new File(['x'], 'cv.pdf', { type: 'application/pdf' })] },
  })

  expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ nhận ảnh JPEG, PNG hoặc WEBP')
  expect(requestsTo(requests, '/users/me/avatar', 'post')).toHaveLength(0)
})

test('flags a wrong current password instead of ending the session', async () => {
  setup({
    changePassword: (config) => {
      throw httpError(config, 401, 'Current password is incorrect')
    },
  })
  await screen.findByRole('heading', { name: profile.fullName })

  fillPasswordForm('sai-mat-khau', 'matkhaumoi123')
  fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu hiện tại không đúng')
  // 401 của /auth/* không phải phiên hết hạn: phiên phải còn nguyên.
  expect(storage.get<string>(STORAGE_KEYS.accessToken)).toBe('access-token')
  expect(screen.queryByText('Trang đăng nhập')).not.toBeInTheDocument()
})

test('changing the password clears the session and goes to the login page', async () => {
  const requests = setup()
  await screen.findByRole('heading', { name: profile.fullName })

  fillPasswordForm('matkhaucu1', 'matkhaumoi123')
  fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))

  // Backend thu hồi refresh token của mọi thiết bị nên phiên này phải bị xoá.
  expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument()
  expect(storage.get<string>(STORAGE_KEYS.accessToken)).toBeNull()
  expect(storage.get<User>(STORAGE_KEYS.user)).toBeNull()
  const changed = requestsTo(requests, '/auth/password/change', 'post')
  expect(JSON.parse(changed[0].data)).toEqual({
    currentPassword: 'matkhaucu1',
    newPassword: 'matkhaumoi123',
  })
})

test('offers a retry when the profile cannot be loaded', async () => {
  let attempt = 0
  setup({
    getProfile: (config) => {
      attempt += 1
      // Hai lần đầu lỗi: AuthProvider làm mới ở nền và trang đều gọi GET /users/me.
      if (attempt <= 2) throw httpError(config, 500, 'Failed to load the profile')
      return profile
    },
  })

  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được hồ sơ')
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))

  expect(await screen.findByRole('heading', { name: profile.fullName })).toBeInTheDocument()
})
