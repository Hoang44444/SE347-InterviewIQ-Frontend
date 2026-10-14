import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { InternalAxiosRequestConfig } from 'axios'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, expect, test } from 'vitest'

import { InterviewListPage } from './InterviewListPage'
import { InterviewRoomPage } from './InterviewRoomPage'

import { ToastProvider } from '@/contexts/ToastProvider'
import { apiClient } from '@/services/apiClient'
import { deferred } from '@/test/interviewFixtures'
import { session, sessionPage, startedSession } from '@/test/sessionFixtures'
import type { InterviewSession, InterviewSessionStatus } from '@/types/interview'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

function LocationState() {
  const { state } = useLocation()
  return <output data-testid="navigation-state">{JSON.stringify(state)}</output>
}

function setup(
  respond: (config: InternalAxiosRequestConfig) => unknown | Promise<unknown> = () => sessionPage(),
  url = '/interviews',
) {
  const requests: InternalAxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    const data = await respond(config)
    return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config }
  }
  const view = render(
    <ToastProvider>
      <MemoryRouter initialEntries={[url]}>
        <LocationState />
        <Link to="/interviews/00000000-0000-4000-8000-000000000004">Đổi phòng</Link>
        <Routes>
          <Route path="/interviews" element={<InterviewListPage />} />
          <Route path="/interviews/:id" element={<InterviewRoomPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
  return { requests, ...view }
}

function httpError(status: number) {
  throw { response: { status, data: { message: 'Backend error' } } }
}

test('preserves backend order, nullable fields and all status labels; only CREATED can start', async () => {
  const statuses: [InterviewSessionStatus, string][] = [
    ['CREATED', 'Đã tạo'],
    ['IN_PROGRESS', 'Đang diễn ra'],
    ['SUBMITTED', 'Đã nộp'],
    ['SCORING', 'Đang chấm điểm'],
    ['COMPLETED', 'Hoàn thành'],
    ['FAILED', 'Thất bại'],
    ['CANCELLED', 'Đã huỷ'],
  ]
  const { requests } = setup(() =>
    sessionPage(
      statuses.map(([status], index) => ({
        ...session,
        status,
        title: `Session ${index}`,
        sessionPublicId: `${session.sessionPublicId.slice(0, -1)}${index}`,
      })),
    ),
  )
  await screen.findByRole('heading', { name: 'Session 0' })
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
    statuses.map((_, index) => `Session ${index}`),
  )
  for (const [, label] of statuses) expect(screen.getByText(label)).toBeInTheDocument()
  expect(screen.getAllByText(/5 câu hỏi/)).toHaveLength(7)
  expect(screen.getAllByRole('button', { name: 'Bắt đầu' })).toHaveLength(1)
  expect(requests[0].url).toBe('/interview-session')
  expect(requests[0].params).toEqual({ pageNumber: 1, pageSize: 20 })
})

test('paginates using backend flags and distinguishes an empty page from an empty account', async () => {
  const { requests } = setup((config) =>
    sessionPage(config.params.pageNumber === 1 ? [session] : [], config.params.pageNumber, 2),
  )
  await screen.findByRole('heading', { name: session.title })
  expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  expect(await screen.findByText('Trang này không có buổi phỏng vấn')).toBeInTheDocument()
  expect(screen.queryByText('Chưa có buổi phỏng vấn nào')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Trang trước' }))
  await screen.findByRole('heading', { name: session.title })
  expect(requests.map((r) => r.params.pageNumber)).toEqual([1, 2, 1])
})

test('empty account offers creation and a failed list can be reloaded', async () => {
  let loads = 0
  setup(() => (++loads === 1 ? httpError(500) : sessionPage([], 1, 0)))
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được danh sách')
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
  expect(await screen.findByText('Chưa có buổi phỏng vấn nào')).toBeInTheDocument()
})

test.each(['list', 'room'])(
  '%s Start locks duplicates, preserves server startedAt and navigates with updated session',
  async (place) => {
    const pending = deferred<typeof startedSession>()
    let started = false
    const second = {
      ...session,
      sessionPublicId: '00000000-0000-4000-8000-000000000004',
      title: 'Second session',
    }
    const { requests } = setup(
      async (config) => {
        if (config.method === 'post') {
          const result = await pending.promise
          started = true
          return result
        }
        return sessionPage([{ ...session, status: started ? 'IN_PROGRESS' : 'CREATED' }, second])
      },
      place === 'list' ? '/interviews' : `/interviews/${session.sessionPublicId}`,
    )
    const buttons = await screen.findAllByRole('button', { name: 'Bắt đầu' })
    fireEvent.click(buttons[0])
    fireEvent.click(buttons[0])
    await waitFor(() => expect(requests.filter((r) => r.method === 'post')).toHaveLength(1))
    expect(buttons[0]).toHaveAttribute('aria-busy', 'true')
    for (const button of buttons) expect(button).toBeDisabled()
    if (buttons[1]) expect(buttons[1]).not.toHaveAttribute('aria-busy')
    await act(async () => pending.resolve(startedSession))
    expect(await screen.findByText('Đang diễn ra')).toBeInTheDocument()
    const timestamp = screen.getByText(/Bắt đầu lúc/).querySelector('time')!
    expect(timestamp).toHaveAttribute('datetime', startedSession.startedAt)
    expect(JSON.parse(screen.getByTestId('navigation-state').textContent!).session).toMatchObject(
      startedSession,
    )
    expect(screen.getByText('Đang chờ nội dung câu hỏi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bắt đầu' })).not.toBeInTheDocument()
    expect(requests.every((r) => r.url?.startsWith('/interview-session'))).toBe(true)
  },
)

test.each([
  ['list', 409],
  ['room', 409],
  ['list', 404],
  ['room', 404],
] as const)(
  '%s HTTP %s reloads and keeps Start locked after failed synchronization until retry succeeds',
  async (place, status) => {
    let loads = 0
    const sync = deferred<ReturnType<typeof sessionPage>>()
    const { requests } = setup(
      (config) => {
        if (config.method === 'post') return httpError(status)
        if (++loads === 1) return sessionPage()
        if (loads === 2) return sync.promise
        return sessionPage([{ ...session, status: 'IN_PROGRESS' }])
      },
      place === 'list' ? '/interviews' : `/interviews/${session.sessionPublicId}`,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
    const message =
      status === 409
        ? 'Phiên phỏng vấn đã bắt đầu hoặc không còn có thể bắt đầu'
        : 'Phiên phỏng vấn không còn khả dụng'
    expect(await screen.findByText(message, { selector: '[role="alert"]' })).toBeInTheDocument()
    await act(async () =>
      sync.reject({ response: { status: 500, data: { message: 'Sync failed' } } }),
    )
    const start = screen.queryByRole('button', { name: 'Bắt đầu' })
    if (start) expect(start).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    expect(await screen.findByText('Đang diễn ra')).toBeInTheDocument()
    expect(screen.queryByText(/Bắt đầu lúc/)).not.toBeInTheDocument()
    expect(requests.filter((r) => r.method === 'post')).toHaveLength(1)
  },
)

test.each([400, 403, 500])(
  'HTTP %s shows appropriate Start feedback and permits retry',
  async (status) => {
    let attempts = 0
    setup((config) =>
      config.method === 'post'
        ? ++attempts === 1
          ? httpError(status)
          : startedSession
        : sessionPage([{ ...session, status: attempts > 1 ? 'IN_PROGRESS' : 'CREATED' }]),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      status === 400
        ? 'Thông tin phiên phỏng vấn không hợp lệ'
        : status === 403
          ? 'Bạn không có quyền bắt đầu phiên phỏng vấn'
          : 'Không thể bắt đầu phiên phỏng vấn. Hãy thử lại',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }))
    await screen.findByText(/Bắt đầu lúc/)
    expect(screen.getByText('Đang diễn ra')).toBeInTheDocument()
  },
)

test('does not send Start for malformed UUID', async () => {
  const { requests } = setup(() => sessionPage([{ ...session, sessionPublicId: 'invalid' }]))
  const start = await screen.findByRole('button', { name: 'Bắt đầu' })
  fireEvent.click(start)
  expect(requests.filter((r) => r.method === 'post')).toHaveLength(0)
})

test('direct URL searches later pages, including after ?created=1, and trusts API status without inventing startedAt', async () => {
  const { requests } = setup(
    (config) =>
      sessionPage(
        config.params.pageNumber === 1 ? [] : [{ ...session, status: 'IN_PROGRESS' }],
        config.params.pageNumber,
        2,
      ),
    `/interviews/${session.sessionPublicId}?created=1`,
  )
  expect(await screen.findByText('Đang diễn ra')).toBeInTheDocument()
  expect(screen.queryByText(/Bắt đầu lúc/)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Bắt đầu' })).not.toBeInTheDocument()
  expect(requests.map((r) => r.params.pageNumber)).toEqual([1, 2])
})

test('missing or malformed session offers return to list without legacy reads', async () => {
  const { requests } = setup(() => sessionPage([], 1, 0), `/interviews/${session.sessionPublicId}`)
  expect(await screen.findByText('Phiên phỏng vấn không còn khả dụng')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Về danh sách' })).toHaveAttribute('href', '/interviews')
  expect(requests).toHaveLength(1)
  expect(requests[0].url).toBe('/interview-session')
})

test('changing rooms while lookup is pending ignores old result and stops searching old pages', async () => {
  const oldPage = deferred<ReturnType<typeof sessionPage>>()
  const next: InterviewSession = {
    ...session,
    sessionPublicId: '00000000-0000-4000-8000-000000000004',
    title: 'New room',
  }
  let loads = 0
  const { requests } = setup(
    () => (++loads === 1 ? oldPage.promise : sessionPage([next])),
    `/interviews/${session.sessionPublicId}`,
  )
  await waitFor(() => expect(requests).toHaveLength(1))
  fireEvent.click(screen.getByRole('link', { name: 'Đổi phòng' }))
  expect(await screen.findByRole('heading', { name: 'New room' })).toBeInTheDocument()
  await act(async () => oldPage.resolve(sessionPage([], 1, 2)))
  expect(screen.queryByRole('heading', { name: session.title })).not.toBeInTheDocument()
  expect(requests).toHaveLength(2)
})

test('changing rooms while Start is pending does not navigate back or update the new room', async () => {
  const pending = deferred<typeof startedSession>()
  const next = {
    ...session,
    sessionPublicId: '00000000-0000-4000-8000-000000000004',
    title: 'New room',
  }
  setup(
    (config) => (config.method === 'post' ? pending.promise : sessionPage([session, next])),
    `/interviews/${session.sessionPublicId}`,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
  fireEvent.click(screen.getByRole('link', { name: 'Đổi phòng' }))
  expect(await screen.findByRole('heading', { name: 'New room' })).toBeInTheDocument()
  await act(async () => pending.resolve(startedSession))
  expect(screen.getByRole('heading', { name: 'New room' })).toBeInTheDocument()
  expect(screen.getByText('Đã tạo')).toBeInTheDocument()
})
