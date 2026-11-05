import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, expect, test } from 'vitest'

import { apiClient } from './apiClient'
import { userService } from './userService'

import { MAX_AVATAR_BYTES } from '@/constants/user'
import type { UserProfile } from '@/types/user'

const profile: UserProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'hoang@example.com',
  fullName: 'Lê Hữu Việt Hoàng',
  avatarUrl: null,
  createdAt: '2026-01-05T08:30:00.000Z',
  updatedAt: '2026-02-11T03:15:42.000Z',
}

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

/** Giả backend: ghi lại request rồi trả về envelope thành công. */
function recordRequests(data: unknown): InternalAxiosRequestConfig[] {
  const requests: InternalAxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    return {
      data: { statusCode: 200, success: true, data, message: 'OK', timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  return requests
}

const png = new File(['x'], 'anh.png', { type: 'image/png' })

test('sends only the changed fields to PATCH /users/me', async () => {
  const requests = recordRequests({ ...profile, fullName: 'Tên Mới' })

  await userService.updateMyProfile({ fullName: 'Tên Mới' })

  expect(requests).toHaveLength(1)
  expect(requests[0].method).toBe('patch')
  expect(requests[0].url).toBe('/users/me')
  expect(JSON.parse(requests[0].data)).toEqual({ fullName: 'Tên Mới' })
})

/**
 * Chốt đúng cái bẫy của axios: Content-Type mặc định của apiClient là
 * application/json, gặp FormData thì axios serialize form thành JSON và backend
 * nhận body rỗng. Test này vỡ nếu ai bỏ phần ghi đè header trong userService.
 */
test('uploads the avatar as multipart, not as JSON', async () => {
  const requests = recordRequests({ avatarUrl: 'https://cdn.test/a.png' })

  const url = await userService.uploadAvatar(png)

  expect(url).toBe('https://cdn.test/a.png')
  expect(requests[0].url).toBe('/users/me/avatar')
  expect(requests[0].data).toBeInstanceOf(FormData)
  // Backend đọc đúng field 'avatar' qua FileInterceptor('avatar').
  expect((requests[0].data as FormData).get('avatar')).toBe(png)
  expect(requests[0].headers['Content-Type']).toBe('multipart/form-data')
})

test('rejects a file that is not an allowed image and never reaches the network', async () => {
  const requests = recordRequests(null)

  await expect(
    userService.uploadAvatar(new File(['x'], 'cv.pdf', { type: 'application/pdf' })),
  ).rejects.toMatchObject({ message: 'Chỉ nhận ảnh JPEG, PNG hoặc WEBP' })
  expect(requests).toHaveLength(0)
})

test('rejects an image above the backend size limit without uploading it', async () => {
  const requests = recordRequests(null)
  const tooBig = new File([new ArrayBuffer(MAX_AVATAR_BYTES + 1)], 'to.png', {
    type: 'image/png',
  })

  await expect(userService.uploadAvatar(tooBig)).rejects.toMatchObject({
    message: 'Ảnh vượt quá 2,0 MB',
  })
  expect(requests).toHaveLength(0)
})
