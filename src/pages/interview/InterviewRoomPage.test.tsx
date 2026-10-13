import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'

import { InterviewRoom } from './InterviewRoomPage'

import { ToastProvider } from '@/contexts/ToastProvider'
import { answer, deferred } from '@/test/interviewFixtures'
import { mockMediaDevices } from '@/test/mediaDevices'
import { roomService } from '@/test/roomService'
import type { Answer, InterviewRoomService } from '@/types/interview'

beforeEach(() => {
  mockMediaDevices()
})

async function openRoom(service: InterviewRoomService) {
  const view = render(
    <MemoryRouter>
      <ToastProvider>
        <InterviewRoom id="session" service={service} />
      </ToastProvider>
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu phỏng vấn' }))
  return view
}
async function startVideo() {
  const enable = screen.queryByRole('button', { name: 'Bật camera và micro' })
  if (enable) fireEvent.click(enable)
  fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu ghi' }))
}
function submitAnswer() {
  fireEvent.click(screen.getByRole('button', { name: /Đã trả lời xong/ }))
}
async function saveVideo() {
  await startVideo()
  submitAnswer()
  await waitFor(() =>
    expect(
      screen.queryByText('Đang lưu câu trả lời', { selector: 'p[role="status"]' }),
    ).not.toBeInTheDocument(),
  )
}

test('requires video, preserves empty transcript and advances only after PUT success', async () => {
  const service = roomService()
  const pending = deferred<Answer>()
  vi.mocked(service.submitAnswer).mockReturnValueOnce(pending.promise)
  await openRoom(service)
  expect(screen.getByRole('button', { name: 'Nộp session' })).toBeDisabled()
  submitAnswer()
  await screen.findByText('Cần có video')
  expect(service.getAnswerSignedParams).not.toHaveBeenCalled()
  await startVideo()
  submitAnswer()
  expect(
    await screen.findByText('Đang lưu câu trả lời', { selector: 'p[role="status"]' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'First question' })).toBeInTheDocument()
  expect(screen.getByRole('textbox')).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true })
  expect(service.submitAnswer).toHaveBeenCalledTimes(1)
  await act(async () => {
    pending.resolve(answer)
  })
  expect(await screen.findByRole('heading', { name: 'Second question' })).toBeInTheDocument()
  expect(service.submitAnswer).toHaveBeenCalledWith('session', 'one', {
    cloudinaryPublicId: 'interview-answers/user/session/question/upload',
    transcript: '',
  })
  expect(screen.getByRole('button', { name: 'Nộp session' })).toBeDisabled()
})

test('failed PUT keeps recording/transcript and retry saves without uploading again', async () => {
  const service = roomService()
  vi.mocked(service.submitAnswer).mockRejectedValueOnce({
    status: 500,
    message: 'Save unavailable',
  })
  await openRoom(service)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: ' answer\n' } })
  await startVideo()
  submitAnswer()
  expect(
    await screen.findByText('Save unavailable', { selector: 'p[role="alert"]' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('textbox')).toHaveValue(' answer\n')
  expect(screen.getByLabelText('Xem lại bản ghi câu 1')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: ' edited ' } })
  submitAnswer()
  await screen.findByRole('heading', { name: 'Second question' })
  expect(service.uploadAnswerVideo).toHaveBeenCalledTimes(1)
  expect(service.submitAnswer).toHaveBeenLastCalledWith('session', 'one', {
    cloudinaryPublicId: 'interview-answers/user/session/question/upload',
    transcript: ' edited ',
  })
})

test('enables confirmation only after all saves; 202 shows scoring and separate answer/video durations', async () => {
  const service = roomService()
  vi.mocked(service.getScoringJobStatus).mockResolvedValue({
    jobId: 'job',
    sessionId: 'session',
    status: 'COMPLETED',
    createdAt: '2026-10-12',
    completedAt: '2026-10-12',
  })
  const { tracks } = mockMediaDevices()
  await openRoom(service)
  await saveVideo()
  await screen.findByRole('heading', { name: 'Second question' })
  await saveVideo()
  const finish = screen.getByRole('button', { name: 'Nộp session' })
  await waitFor(() => expect(finish).toBeEnabled())
  fireEvent.click(finish)
  const dialog = screen.getByRole('dialog', { name: 'Nộp session để chấm điểm' })
  expect(service.finishSession).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận nộp' }))
  expect(await screen.findByRole('heading', { name: /Đã nộp/ })).toBeInTheDocument()
  expect(await screen.findByText('Đã chấm điểm xong')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Đã nộp — đã chấm điểm' })).toBeInTheDocument()
  expect(screen.getAllByText(/Thời lượng video: 00:13/)).toHaveLength(2)
  expect(screen.getAllByText(/Thời gian trả lời:/)).toHaveLength(2)
  expect(service.finishSession).toHaveBeenCalledWith('session', {
    cvPublicId: 'cv',
    totalQuestions: 2,
    durationSeconds: expect.any(Number),
  })
  for (const track of tracks) expect(track.stop).toHaveBeenCalled()
})

test('submit failure freezes answers and exposes only session retry', async () => {
  const service = roomService()
  vi.mocked(service.finishSession).mockRejectedValueOnce({
    status: 500,
    message: 'Queue unavailable',
  })
  await openRoom(service)
  await saveVideo()
  await screen.findByRole('heading', { name: 'Second question' })
  await saveVideo()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Nộp session' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Nộp session' }))
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Nộp session để chấm điểm' })).getByRole('button', {
      name: 'Xác nhận nộp',
    }),
  )
  expect(
    await screen.findByText('Queue unavailable', { selector: 'p[role="alert"]' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Thử nộp session lại' }))
  await screen.findByRole('heading', { name: /Đã nộp/ })
  expect(service.finishSession).toHaveBeenCalledTimes(2)
  expect(service.uploadAnswerVideo).toHaveBeenCalledTimes(2)
})

test('permission denial explains required video; transcript has 50000 character limit', async () => {
  const { getUserMedia } = mockMediaDevices()
  getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
  await openRoom(roomService())
  expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '50000')
  fireEvent.click(screen.getByRole('button', { name: 'Bật camera và micro' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa được cấp quyền')
  expect(screen.queryByRole('button', { name: 'Tiếp tục bằng chữ' })).not.toBeInTheDocument()
})

test('pending device permission can be canceled while transcript stays editable', async () => {
  const { getUserMedia, tracks } = mockMediaDevices()
  const pending = deferred<MediaStream>()
  getUserMedia.mockReturnValue(pending.promise)
  const service = roomService()
  await openRoom(service)
  fireEvent.click(screen.getByRole('button', { name: 'Bật camera và micro' }))
  expect(screen.getByRole('textbox')).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Hủy yêu cầu thiết bị' })).toBeEnabled()
  expect(screen.getByRole('button', { name: /Đã trả lời xong/ })).toBeDisabled()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'draft during permission' } })
  fireEvent.click(screen.getByRole('button', { name: 'Hủy yêu cầu thiết bị' }))
  await screen.findByRole('button', { name: 'Bật camera và micro' })
  await act(async () => {
    pending.resolve({ getTracks: () => tracks } as unknown as MediaStream)
  })
  for (const track of tracks) expect(track.stop).toHaveBeenCalled()
  expect(screen.getByRole('textbox')).toHaveValue('draft during permission')
  expect(service.getAnswerSignedParams).not.toHaveBeenCalled()
})
