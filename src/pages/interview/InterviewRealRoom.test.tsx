import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { InternalAxiosRequestConfig } from 'axios'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { InterviewRoomPage } from './InterviewRoomPage'

import { ToastProvider } from '@/contexts/ToastProvider'
import { apiClient } from '@/services/apiClient'
import { mockMediaDevices } from '@/test/mediaDevices'
import { TestRouter } from '@/test/TestRouter'
import {
  generatedQuestions,
  roomLoadData,
  session,
  sessionDetail,
  sessionPage,
} from '@/test/sessionFixtures'
import type { InterviewSessionStatus } from '@/types/interview'

/* Chỉ thay hai ranh giới ngoài trình duyệt: socket.io và model nhận diện khuôn mặt. */
const socket = vi.hoisted(() => ({
  connected: false,
  active: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}))
vi.mock('socket.io-client', () => ({ io: () => socket }))
vi.mock('@/services/faceDetector', () => ({
  createFaceDetector: () => Promise.reject(new Error('Không có detector trong test')),
}))

const id = session.sessionPublicId
const originalAdapter = apiClient.defaults.adapter

beforeEach(() => {
  mockMediaDevices()
  socket.connect.mockClear()
})
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  setVisibility('visible')
})

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  document.dispatchEvent(new Event('visibilitychange'))
}

/** Mở route thật /interviews/:id với backend giả ở tầng HTTP. */
function openRoute(status: InterviewSessionStatus = 'IN_PROGRESS') {
  const requests: InternalAxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    const data =
      config.method === 'post'
        ? { log: {}, summary: { ...sessionDetail.cheatSummary, totalCount: 1 } }
        : (roomLoadData(config) ?? sessionPage([{ ...session, status }]))
    return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config }
  }
  render(
    <ToastProvider>
      <TestRouter initialEntries={[`/interviews/${id}`]}>
        <Routes>
          <Route path="/interviews/:id" element={<InterviewRoomPage />} />
        </Routes>
      </TestRouter>
    </ToastProvider>,
  )
  return requests
}

async function startInterview() {
  const start = await screen.findByRole('button', { name: 'Bắt đầu phỏng vấn' })
  fireEvent.click(screen.getByRole('button', { name: 'Bật camera và micro' }))
  await waitFor(() => expect(start).toBeEnabled())
  fireEvent.click(start)
}

test('an in-progress session opens the interview room with the generated questions', async () => {
  openRoute()

  expect(await screen.findByRole('heading', { name: 'Phòng chờ' })).toBeInTheDocument()
  expect(screen.getByText('2 câu hỏi')).toBeInTheDocument()
  await startInterview()

  const [first] = generatedQuestions.questions
  expect(screen.getByRole('heading', { name: first.content })).toBeInTheDocument()
  expect(screen.getByText('Kỹ thuật')).toBeInTheDocument()
  expect(screen.getByText('Trung bình')).toBeInTheDocument()
  // Backend không trả thời gian gợi ý nên phòng chỉ hiện thời gian đã trả lời.
  expect(screen.getByText('Thời gian trả lời')).toBeInTheDocument()
  expect(screen.queryByText(/thời gian gợi ý/i)).not.toBeInTheDocument()
})

test('leaving the tab during the real interview is logged to this backend session', async () => {
  const requests = openRoute()
  await startInterview()
  expect(socket.connect).toHaveBeenCalled()

  await act(async () => setVisibility('hidden'))

  const posts = requests.filter((request) => request.method === 'post')
  expect(posts.map((request) => request.url)).toEqual([`/interview-session/${id}/cheat-logs`])
  expect(JSON.parse(posts[0].data)).toMatchObject({ eventType: 'TAB_SWITCH' })
  expect(await screen.findByText('1 lần vi phạm')).toBeInTheDocument()
})

test.each([
  ['SUBMITTED', 'Xem chi tiết'],
  ['COMPLETED', 'Xem kết quả'],
] as const)(
  'a %s session links to its result instead of opening the room',
  async (status, label) => {
    const requests = openRoute(status)

    expect(await screen.findByRole('link', { name: label })).toHaveAttribute(
      'href',
      `/history/${id}`,
    )
    expect(screen.queryByRole('heading', { name: 'Phòng chờ' })).not.toBeInTheDocument()
    expect(requests.map((request) => request.url)).toEqual(['/interview-session'])
  },
)
