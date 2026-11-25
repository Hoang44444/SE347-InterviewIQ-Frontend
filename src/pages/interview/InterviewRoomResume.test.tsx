import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'

import { InterviewRoom } from './InterviewRoomPage'

import { ToastProvider } from '@/contexts/ToastProvider'
import { mockMediaDevices } from '@/test/mediaDevices'
import { roomService } from '@/test/roomService'
import { TestRouter } from '@/test/TestRouter'
import type { Interview, SavedAnswer } from '@/types/interview'

vi.mock('@/services/faceDetector', () => ({
  createFaceDetector: () => Promise.reject(new Error('Không có detector trong test')),
}))

const startedAt = '2026-11-25T10:00:00.000Z'
const serverStart = Date.parse(startedAt)
let now = serverStart

beforeEach(() => {
  mockMediaDevices()
  now = serverStart
  vi.spyOn(Date, 'now').mockImplementation(() => now)
})

const saved = (questionPublicId: string): SavedAnswer => ({
  questionPublicId,
  videoUrl: `https://videos.test/${questionPublicId}.webm`,
  transcript: `đã nộp ${questionPublicId}`,
  durationSeconds: 12,
})
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const timer = () => screen.getByRole('timer', { name: 'Tổng thời gian' })

function open(overrides: Partial<Interview> = { startedAt }) {
  const service = roomService()
  vi.mocked(service.getById).mockResolvedValue({
    id: 'session',
    title: 'Interview',
    cvPublicId: 'cv',
    ...overrides,
  })
  const view = render(
    <ToastProvider>
      <TestRouter>
        <InterviewRoom id="session" service={service} />
      </TestRouter>
    </ToastProvider>,
  )
  return { service, ...view }
}
async function enter(button: 'Bắt đầu phỏng vấn' | 'Tiếp tục phỏng vấn') {
  const start = await screen.findByRole('button', { name: button })
  click('Bật camera và micro')
  await waitFor(() => expect(start).toBeEnabled())
  fireEvent.click(start)
}

test('saved answers come back: the room resumes at the first unanswered question', async () => {
  now = serverStart + 125_000
  const { service } = open({ startedAt, savedAnswers: [saved('one')] })

  expect(await screen.findByText(/Bạn đã nộp 1\/2 câu/)).toBeInTheDocument()
  await enter('Tiếp tục phỏng vấn')

  expect(screen.getByRole('heading', { name: 'Second question' })).toBeInTheDocument()
  await waitFor(() => expect(timer()).toHaveTextContent('02:05'))
  expect(screen.getByRole('button', { name: 'Nộp bài phỏng vấn' })).toBeDisabled()

  click('Bắt đầu ghi')
  click('Nộp câu trả lời')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Nộp bài phỏng vấn' })).toBeEnabled(),
  )
  click('Nộp bài phỏng vấn')
  click('Xác nhận nộp')

  await screen.findByRole('heading', { name: 'Đã nộp — đang chấm điểm' })
  expect(service.finishSession).toHaveBeenCalledWith('session', {
    cvPublicId: 'cv',
    totalQuestions: 2,
    durationSeconds: 125,
  })
  expect(screen.getByText('đã nộp one')).toBeInTheDocument()
  // Không biết thời gian trả lời của câu nộp trước khi tải lại thì không bịa ra 00:00.
  expect(screen.getAllByText(/Thời gian trả lời:/)).toHaveLength(1)
})

test('with every answer saved, the resumed room can submit straight away', async () => {
  open({ startedAt, savedAnswers: [saved('one'), saved('two')] })

  expect(await screen.findByText(/Đã nộp đủ 2 câu/)).toBeInTheDocument()
  await enter('Tiếp tục phỏng vấn')

  expect(screen.getByRole('button', { name: 'Nộp bài phỏng vấn' })).toBeEnabled()
  expect(screen.getByRole('textbox')).toHaveValue('đã nộp two')
})

test('reloading before the first answer keeps counting from the original start', async () => {
  now = serverStart + 600_000
  const first = open()
  await enter('Bắt đầu phỏng vấn')
  first.unmount()

  mockMediaDevices()
  now += 90_000
  open()
  await enter('Tiếp tục phỏng vấn')

  await waitFor(() => expect(timer()).toHaveTextContent('01:30'))
})

test('a session never entered starts at zero, however long ago the server started it', async () => {
  now = serverStart + 3_600_000
  open()
  await enter('Bắt đầu phỏng vấn')
  now += 3_000

  await waitFor(() => expect(timer()).toHaveTextContent('00:03'))
})

test.each([['"nonsense"'], [String(serverStart + 999_999_999)]])(
  'an unusable remembered start (%s) is ignored',
  async (value) => {
    localStorage.setItem('interviewiq:room_clock:session', value)
    open()

    expect(await screen.findByRole('button', { name: 'Bắt đầu phỏng vấn' })).toBeInTheDocument()
  },
)

test('the remembered start is dropped once the session is submitted', async () => {
  open({ startedAt, savedAnswers: [saved('one'), saved('two')] })
  await enter('Tiếp tục phỏng vấn')
  expect(localStorage.getItem('interviewiq:room_clock:session')).not.toBeNull()

  click('Nộp bài phỏng vấn')
  click('Xác nhận nộp')

  await waitFor(() => expect(localStorage.getItem('interviewiq:room_clock:session')).toBeNull())
})

test('a room without a server start time, such as the demo, remembers nothing', async () => {
  open({})
  await enter('Bắt đầu phỏng vấn')

  expect(localStorage.getItem('interviewiq:room_clock:session')).toBeNull()
})
