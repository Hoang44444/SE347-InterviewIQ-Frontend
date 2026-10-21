import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, test } from 'vitest'

import { InterviewListPage } from './InterviewListPage'
import { InterviewRoomPage } from './InterviewRoomPage'

import { STORAGE_KEYS } from '@/constants'
import { ToastProvider } from '@/contexts/ToastProvider'
import { apiClient } from '@/services/apiClient'
import { session, sessionPage, startedSession } from '@/test/sessionFixtures'
import type { InterviewSession } from '@/types/interview'
import { storage } from '@/utils/storage'

const cvId = '00000000-0000-4000-8000-000000000002'
const sessionId = '00000000-0000-4000-8000-000000000003'
const cv = {
  publicId: cvId,
  fileName: 'backend-cv.pdf',
  fileSize: 2048,
  isActive: true,
  parseStatus: 'COMPLETED',
  createdAt: '2026-10-13T08:00:00.000Z',
}
const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

function setup({
  cvs = [cv],
  create = async () => ({ publicId: sessionId }),
  loadCvs,
}: {
  cvs?: (typeof cv)[]
  create?: () => Promise<{ publicId: string }>
  loadCvs?: () => Promise<(typeof cv)[]>
} = {}) {
  const requests: InternalAxiosRequestConfig[] = []
  let created: InterviewSession | null = null
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    if (config.url === `/interview-session/${sessionId}/start` && created) {
      created = { ...created, ...startedSession }
    }
    const data = config.url?.endsWith('/start')
      ? startedSession
      : config.url === '/cvs'
        ? loadCvs
          ? await loadCvs()
          : cvs
        : config.url === '/interview-session' && config.method === 'post'
          ? await create().then((result) => {
              const payload = JSON.parse(config.data)
              created = { ...session, sessionPublicId: result.publicId, ...payload }
              return result
            })
          : sessionPage(created ? [created] : [], 1, created ? 1 : 0)
    return {
      data: {
        statusCode: config.method === 'post' ? 201 : 200,
        success: true,
        data,
        message: 'OK',
        timestamp: '2026-10-13T08:00:00.000Z',
      },
      status: config.method === 'post' ? 201 : 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  storage.set(STORAGE_KEYS.accessToken, 'test-token')
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/interviews']}>
        <Routes>
          <Route path="/interviews" element={<InterviewListPage />} />
          <Route path="/interviews/:id" element={<InterviewRoomPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Tạo buổi mới' }))
  return requests
}

test('create → opens API-confirmed room → starts and preserves server timestamp', async () => {
  const requests = setup()
  await fillForm()
  submit()
  fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
  await screen.findByText(/Bắt đầu lúc/)
  expect(screen.getByText('Đang diễn ra')).toBeInTheDocument()
  expect(screen.getByText(/Bắt đầu lúc/).querySelector('time')).toHaveAttribute(
    'datetime',
    startedSession.startedAt,
  )
  const start = requests.find((r) => r.url?.endsWith('/start'))!
  expect(start.url).toBe(`/interview-session/${sessionId}/start`)
  expect(start.method).toBe('post')
  expect(start.data).toBeUndefined()
  expect(requests.every((r) => r.url === '/cvs' || r.url?.startsWith('/interview-session'))).toBe(
    true,
  )
})

async function fillForm(title = '  Phỏng vấn Backend Developer  ', jd = 'NestJS, PostgreSQL') {
  const select = await screen.findByRole('combobox', { name: 'Chọn CV' })
  await waitFor(() => expect(select).not.toBeDisabled())
  fireEvent.change(select, { target: { value: cvId } })
  fireEvent.change(screen.getByLabelText('Tên buổi phỏng vấn', { exact: false }), {
    target: { value: title },
  })
  fireEvent.change(screen.getByLabelText('Mô tả công việc / JD'), { target: { value: jd } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Tạo phòng' }))
}

test('loads owned CVs with bearer token, disables unavailable options, and submits only the three API fields', async () => {
  const requests = setup({
    cvs: [
      cv,
      { ...cv, publicId: 'pending', fileName: 'pending.pdf', parseStatus: 'PENDING' },
      { ...cv, publicId: 'processing', fileName: 'processing.pdf', parseStatus: 'PROCESSING' },
      { ...cv, publicId: 'failed', fileName: 'failed.pdf', parseStatus: 'FAILED' },
      { ...cv, publicId: 'inactive', fileName: 'inactive.pdf', isActive: false },
    ],
  })
  await fillForm()
  for (const name of ['pending.pdf', 'processing.pdf', 'failed.pdf', 'inactive.pdf']) {
    expect(screen.getByRole('option', { name: new RegExp(name) })).toBeDisabled()
  }
  expect(screen.getByRole('option', { name: 'backend-cv.pdf' })).toHaveValue(cvId)
  expect(within(screen.getByRole('dialog')).getAllByRole('textbox')).toHaveLength(2)
  submit()
  expect(await screen.findByText('Đang chờ nội dung câu hỏi')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Phỏng vấn Backend Developer' })).toBeInTheDocument()
  const request = requests.find(
    ({ url, method }) => url === '/interview-session' && method === 'post',
  )!
  expect(request.method).toBe('post')
  expect(JSON.parse(request.data)).toEqual({
    cvPublicId: cvId,
    title: 'Phỏng vấn Backend Developer',
    jobDescription: 'NestJS, PostgreSQL',
  })
  expect(request.headers.Authorization).toBe('Bearer test-token')
  expect(requests.find(({ url }) => url === '/cvs')?.headers.Authorization).toBe(
    'Bearer test-token',
  )
  // CREATED has no questions yet: entering the room must not fetch the legacy room or start AI/media.
  expect(requests.map(({ url }) => url)).toEqual([
    '/interview-session',
    '/cvs',
    '/interview-session',
    '/interview-session',
  ])
})

test('omits optional blank JD from the request', async () => {
  const requests = setup()
  await fillForm('Buổi mới', '')
  submit()
  await screen.findByText('Đang chờ nội dung câu hỏi')
  expect(
    JSON.parse(
      requests.find(({ url, method }) => url === '/interview-session' && method === 'post')!.data,
    ),
  ).toEqual({
    cvPublicId: cvId,
    title: 'Buổi mới',
  })
})

test.each([
  { cvs: [] },
  { cvs: [{ ...cv, parseStatus: 'PROCESSING' }] },
  { cvs: [{ ...cv, isActive: false }] },
])('blocks creation and offers upload/wait guidance when no CV is eligible', async ({ cvs }) => {
  const requests = setup({ cvs })
  expect(await screen.findByText('Chưa có CV sẵn sàng để tạo phòng')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Tải lại danh sách CV' })).toBeEnabled()
  expect(requests.some(({ method }) => method === 'post')).toBe(false)
})

test.each([
  ['   ', '', 'Vui lòng nhập tên buổi phỏng vấn.'],
  ['x'.repeat(256), '', 'Tên buổi phỏng vấn tối đa 255 ký tự.'],
  ['Buổi mới', 'x'.repeat(10001), 'Mô tả công việc tối đa 10.000 ký tự.'],
])('validates blank title and both length limits before sending', async (title, jd, message) => {
  const requests = setup()
  await fillForm(title, jd)
  fireEvent.submit(screen.getByLabelText('Tên buổi phỏng vấn', { exact: false }).closest('form')!)
  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(requests.some(({ method }) => method === 'post')).toBe(false)
})

test('locks submission and dismissal while creating, including duplicate submit events', async () => {
  let resolve!: (value: { publicId: string }) => void
  const requests = setup({ create: () => new Promise((done) => (resolve = done)) })
  await fillForm()
  const form = screen.getByLabelText('Tên buổi phỏng vấn', { exact: false }).closest('form')!
  fireEvent.submit(form)
  fireEvent.submit(form)
  await waitFor(() => expect(requests.filter(({ method }) => method === 'post')).toHaveLength(1))
  expect(screen.getByRole('button', { name: /Đang tạo phòng…/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Huỷ' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Đóng' })).toBeDisabled()
  await act(async () => resolve({ publicId: sessionId }))
  expect(await screen.findByText('Đang chờ nội dung câu hỏi')).toBeInTheDocument()
})

test('shows backend validation beside each field and preserves input for retry', async () => {
  setup({
    create: async () => {
      throw {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: [
              { field: 'title', messages: ['Tên không hợp lệ'] },
              { field: 'jobDescription', messages: ['JD không hợp lệ'] },
              { field: 'cvPublicId', messages: ['CV không hợp lệ'] },
            ],
          },
        },
      }
    },
  })
  await fillForm()
  submit()
  for (const message of ['Tên không hợp lệ', 'JD không hợp lệ', 'CV không hợp lệ']) {
    expect(await screen.findByText(message)).toBeInTheDocument()
  }
  expect(screen.getByLabelText('Tên buổi phỏng vấn', { exact: false })).toHaveValue(
    '  Phỏng vấn Backend Developer  ',
  )
  expect(screen.getByLabelText('Mô tả công việc / JD')).toHaveValue('NestJS, PostgreSQL')
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled()
})

test('clears unavailable CV and reloads the list on 404 while retaining title/JD', async () => {
  let loads = 0
  const requests = setup({
    loadCvs: async () => (++loads === 1 ? [cv] : [{ ...cv, isActive: false }]),
    create: async () => {
      throw { response: { status: 404, data: { message: 'CV not found' } } }
    },
  })
  await fillForm()
  submit()
  expect(await screen.findByText(/CV không còn khả dụng/)).toBeInTheDocument()
  await waitFor(() => expect(requests.filter(({ url }) => url === '/cvs')).toHaveLength(2))
  expect(screen.getByRole('combobox', { name: 'Chọn CV' })).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled()
  expect(screen.getByLabelText('Mô tả công việc / JD')).toHaveValue('NestJS, PostgreSQL')
})

test.each([
  [403, /Tài khoản không có quyền tạo phòng phỏng vấn/],
  [500, /Tạo phòng thất bại/],
])('shows appropriate HTTP %s feedback and allows retry', async (status, message) => {
  let attempts = 0
  setup({
    create: async () => {
      if (++attempts === 1) throw { response: { status, data: { message: 'Backend error' } } }
      return { publicId: sessionId }
    },
  })
  await fillForm()
  submit()
  expect(await screen.findByText(message)).toBeInTheDocument()
  submit()
  expect(await screen.findByText('Đang chờ nội dung câu hỏi')).toBeInTheDocument()
})

test('keeps creation disabled during CV loading and retries a failed CV request', async () => {
  let loads = 0
  setup({
    loadCvs: async () => {
      if (++loads === 1) throw { response: { status: 500, data: { message: 'CV load failed' } } }
      return [cv]
    },
  })
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled()
  expect(await screen.findByText(/Không tải được danh sách CV/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại danh sách CV' }))
  await fillForm()
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled()
})

test('opens the newly created room URL in a fresh navigation without using legacy room APIs', async () => {
  const requests: InternalAxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    return {
      data: { success: true, data: sessionPage([session]) },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/interviews/${sessionId}?created=1`]}>
        <Routes>
          <Route path="/interviews/:id" element={<InterviewRoomPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
  expect(await screen.findByText('Đang chờ nội dung câu hỏi')).toBeInTheDocument()
  expect(requests).toHaveLength(1)
  expect(requests[0].url).toBe('/interview-session')
})
