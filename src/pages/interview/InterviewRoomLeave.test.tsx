import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'

import { InterviewRoom } from './InterviewRoomPage'

import { ToastProvider } from '@/contexts/ToastProvider'
import { mockMediaDevices } from '@/test/mediaDevices'
import { roomService } from '@/test/roomService'
import { TestRouter } from '@/test/TestRouter'

vi.mock('@/services/faceDetector', () => ({
  createFaceDetector: () => Promise.reject(new Error('Không có detector trong test')),
}))

beforeEach(() => {
  mockMediaDevices()
})

const question = 'Rời phòng phỏng vấn?'
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

async function openLobby() {
  render(
    <ToastProvider>
      <TestRouter>
        <Link to="/elsewhere">Trang khác</Link>
        <Routes>
          <Route path="/" element={<InterviewRoom id="session" service={roomService()} />} />
          <Route path="/elsewhere" element={<p>Đã rời phòng</p>} />
        </Routes>
      </TestRouter>
    </ToastProvider>,
  )
  return screen.findByRole('button', { name: 'Bắt đầu phỏng vấn' })
}
async function startInterview() {
  const start = await openLobby()
  click('Bật camera và micro')
  await waitFor(() => expect(start).toBeEnabled())
  fireEvent.click(start)
}
const navigateAway = () => fireEvent.click(screen.getByRole('link', { name: 'Trang khác' }))

test('leaving during the interview asks first, and staying keeps the room', async () => {
  await startInterview()
  navigateAway()

  expect(await screen.findByRole('heading', { name: question })).toBeInTheDocument()
  expect(screen.queryByText('Đã rời phòng')).not.toBeInTheDocument()

  click('Ở lại')
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: question })).not.toBeInTheDocument(),
  )
  expect(screen.getByRole('heading', { name: 'First question' })).toBeInTheDocument()
})

test('confirming leaves the room', async () => {
  await startInterview()
  navigateAway()
  await screen.findByRole('heading', { name: question })
  click('Rời phòng')

  expect(await screen.findByText('Đã rời phòng')).toBeInTheDocument()
})

test('leaving the lobby does not ask', async () => {
  await openLobby()
  navigateAway()

  expect(await screen.findByText('Đã rời phòng')).toBeInTheDocument()
})

test('leaving after the interview is submitted does not ask', async () => {
  await startInterview()
  for (const calls of [1, 2]) {
    click('Bắt đầu ghi')
    click('Nộp câu trả lời')
    await screen.findByText(`Câu ${calls}/2`, { selector: 'p' }).catch(() => {})
    if (calls === 1) await screen.findByRole('heading', { name: 'Second question' })
  }
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Nộp bài phỏng vấn' })).toBeEnabled(),
  )
  click('Nộp bài phỏng vấn')
  click('Xác nhận nộp')
  await screen.findByRole('heading', { name: 'Đã nộp — đang chấm điểm' })
  navigateAway()

  expect(await screen.findByText('Đã rời phòng')).toBeInTheDocument()
})
