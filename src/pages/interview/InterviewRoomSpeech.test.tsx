import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { InterviewRoom } from './InterviewRoomPage'

import { ToastProvider } from '@/contexts/ToastProvider'
import { mockMediaDevices } from '@/test/mediaDevices'
import { roomService } from '@/test/roomService'
import { FakeRecognition } from '@/test/speechRecognition'
import { TestRouter } from '@/test/TestRouter'

vi.mock('@/services/faceDetector', () => ({
  createFaceDetector: () => Promise.reject(new Error('Không có detector trong test')),
}))

const speechWindow = window as unknown as Record<string, unknown>
let media: ReturnType<typeof mockMediaDevices>

beforeEach(() => {
  media = mockMediaDevices()
  FakeRecognition.instances = []
  FakeRecognition.startError = null
  speechWindow.SpeechRecognition = FakeRecognition
})
afterEach(() => {
  delete speechWindow.SpeechRecognition
})

const recognizer = () => FakeRecognition.instances[FakeRecognition.instances.length - 1]
const textbox = () => screen.getByRole('textbox')

function say(text: string, isFinal = true) {
  act(() => recognizer().emit([{ text, isFinal }]))
}
function type(text: string) {
  fireEvent.change(textbox(), { target: { value: text } })
}
function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

async function openRoom() {
  const service = roomService()
  render(
    <TestRouter>
      <ToastProvider>
        <InterviewRoom id="session" service={service} />
      </ToastProvider>
    </TestRouter>,
  )
  const start = await screen.findByRole('button', { name: 'Bắt đầu phỏng vấn' })
  click('Bật camera và micro')
  await waitFor(() => expect(start).toBeEnabled())
  fireEvent.click(start)
  return service
}
async function stopRecording() {
  click('Dừng ghi')
  await screen.findByRole('button', { name: 'Ghi lại' })
}
function retake() {
  click('Ghi lại')
  click('Bắt đầu ghi lại')
}
async function submitAnswer(service: ReturnType<typeof roomService>, calls = 1) {
  click('Nộp câu trả lời')
  await waitFor(() => expect(service.submitAnswer).toHaveBeenCalledTimes(calls))
  return vi.mocked(service.submitAnswer).mock.calls[calls - 1][2].transcript
}

test('speech is transcribed into the answer while recording and sent on submit', async () => {
  const service = await openRoom()
  expect(FakeRecognition.instances).toHaveLength(0)

  click('Bắt đầu ghi')
  expect(recognizer().start).toHaveBeenCalledTimes(1)
  expect(recognizer().lang).toBe('vi-VN')
  expect(textbox()).toHaveAttribute('readonly')
  expect(screen.getByText('Đang chép lời')).toBeInTheDocument()

  say('tôi dùng phân trang theo con trỏ')
  say('và đánh chỉ mục', false)
  expect(textbox()).toHaveValue('tôi dùng phân trang theo con trỏ và đánh chỉ mục')

  expect(await submitAnswer(service)).toBe('tôi dùng phân trang theo con trỏ và đánh chỉ mục')
})

test('typed notes stay in front, and the transcript can be corrected after stopping', async () => {
  const service = await openRoom()
  type('Ý chính: cursor.')
  click('Bắt đầu ghi')
  say('em chọn con trỏ')
  const first = recognizer()
  await stopRecording()

  expect(first.stop).toHaveBeenCalled()
  expect(textbox()).not.toHaveAttribute('readonly')
  // Kết quả chốt cuối cùng về sau khi đã dừng vẫn phải vào ô.
  act(() =>
    first.emit(
      [
        { text: 'em chọn con trỏ', isFinal: true },
        { text: 'vì ổn định', isFinal: true },
      ],
      1,
    ),
  )
  expect(textbox()).toHaveValue('Ý chính: cursor. em chọn con trỏ vì ổn định')

  type('Ý chính: cursor. Em chọn con trỏ vì kết quả ổn định.')
  expect(await submitAnswer(service)).toBe('Ý chính: cursor. Em chọn con trỏ vì kết quả ổn định.')
})

test('a retake replaces the speech of the previous take but keeps typed notes', async () => {
  await openRoom()
  type('Ghi chú.')
  click('Bắt đầu ghi')
  say('lần một')
  await stopRecording()

  retake()
  expect(textbox()).toHaveValue('Ghi chú.')
  say('lần hai')
  await stopRecording()

  expect(textbox()).toHaveValue('Ghi chú. lần hai')
})

test('a failed retake keeps the text that belongs to the kept recording', async () => {
  await openRoom()
  click('Bắt đầu ghi')
  say('bản được giữ')
  await stopRecording()

  retake()
  say('bản hỏng')
  await act(async () => {
    media.FakeRecorder.instances.at(-1)!.dispatchEvent(new Event('error'))
  })

  expect(textbox()).toHaveValue('bản được giữ')
  expect(textbox()).not.toHaveAttribute('readonly')
})

test('the next question starts empty and ignores late speech from the previous one', async () => {
  const service = await openRoom()
  click('Bắt đầu ghi')
  say('câu một')
  const first = recognizer()
  await submitAnswer(service)
  await screen.findByRole('heading', { name: 'Second question' })

  act(() => first.emit([{ text: 'tiếng đến muộn', isFinal: true }]))
  expect(textbox()).toHaveValue('')

  click('Bắt đầu ghi')
  say('câu hai')
  expect(textbox()).toHaveValue('câu hai')
  expect(await submitAnswer(service, 2)).toBe('câu hai')
})

test('a recognition error is explained and the answer can still be typed', async () => {
  await openRoom()
  click('Bắt đầu ghi')
  act(() => recognizer().fail('network'))

  expect(screen.getByText(/Dịch vụ nhận dạng giọng nói không kết nối được/)).toBeInTheDocument()
  expect(textbox()).not.toHaveAttribute('readonly')
})

test('a browser without speech recognition says so and typing still works', async () => {
  delete speechWindow.SpeechRecognition
  const service = await openRoom()
  expect(screen.getByText(/Trình duyệt này không chép lời tự động/)).toBeInTheDocument()

  click('Bắt đầu ghi')
  expect(textbox()).not.toHaveAttribute('readonly')
  type('Tự gõ')

  expect(await submitAnswer(service)).toBe('Tự gõ')
})

test('the lobby says the audio may leave the machine for transcription', async () => {
  render(
    <TestRouter>
      <ToastProvider>
        <InterviewRoom id="session" service={roomService()} />
      </ToastProvider>
    </TestRouter>,
  )
  expect(await screen.findByText(/gửi âm thanh tới máy chủ của hãng/)).toBeInTheDocument()
})
