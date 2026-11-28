import { act, render, screen, waitFor } from '@testing-library/react'
import type { InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { HistoryDetailPage } from './HistoryDetailPage'

import { STORAGE_KEYS } from '@/constants'
import { ToastProvider } from '@/contexts/ToastProvider'
import { apiClient } from '@/services/apiClient'
import { openScoringStream, type OpenScoringStreamOptions } from '@/services/scoringStreamService'
import type { InterviewHistoryDetail } from '@/types/history'
import type { SessionQuestions } from '@/types/interview'
import type { SessionResult } from '@/types/scoring'
import { storage } from '@/utils/storage'

vi.mock('@/services/scoringStreamService', () => ({
  openScoringStream: vi.fn(),
}))

let capturedStreamOptions: OpenScoringStreamOptions | undefined

beforeEach(() => {
  capturedStreamOptions = undefined
  vi.mocked(openScoringStream).mockReset()
  vi.mocked(openScoringStream).mockImplementation((options) => {
    capturedStreamOptions = options
    return new Promise(() => {})
  })
})

const sessionId = '3f1c2b9e-8a4d-4f6b-9c1e-2d7a5b0e4f11'

const detail: InterviewHistoryDetail = {
  id: sessionId,
  title: 'Backend Intern - NestJS',
  jobDescription: 'Xây dựng REST API với NestJS',
  status: 'COMPLETED',
  totalQuestions: 5,
  durationSeconds: 842,
  startedAt: '2026-10-20T08:00:00.000Z',
  submittedAt: '2026-10-20T08:13:40.000Z',
  completedAt: '2026-10-20T08:14:02.000Z',
  createdAt: '2026-10-20T07:58:11.000Z',
  cv: { id: '9b1c2d3e-4f50-4a6b-8c7d-0e1f2a3b4c5d', fileName: 'nguyen-van-a-cv.pdf' },
  score: null,
  summary: null,
  questions: [],
  isFlagged: false,
  cheatSummary: {
    totalCount: 0,
    countsByType: { TAB_SWITCH: 0, WINDOW_BLUR: 0, FACE_MISSING: 0, MULTIPLE_FACES: 0 },
  },
  cheatLogs: [],
}

const result: SessionResult = {
  sessionId,
  scores: {
    publicId: '550e8400-e29b-41d4-a716-446655440000',
    contentScore: 8,
    relevanceScore: 7.5,
    confidenceScore: 6.5,
    overallScore: 7.4,
    scoredAt: '2026-10-20T08:14:02.000Z',
  },
  summary: {
    publicId: '660e8400-e29b-41d4-a716-446655440000',
    overallFeedback: 'Ứng viên nắm vững kiến thức nền tảng.',
    strengths: [
      { category: 'TECHNICAL_KNOWLEDGE', title: 'Nắm vững chuyên môn', description: 'Hiểu rõ.' },
    ],
    improvements: [
      {
        category: 'COMMUNICATION',
        title: 'Trình bày súc tích hơn',
        description: 'Đi thẳng vào kết quả.',
        suggestion: 'Áp dụng mô hình STAR.',
      },
    ],
    scoringModel: 'gemini-2.5-flash',
    promptVersion: 'v1.0',
    generatedAt: '2026-10-20T08:14:02.000Z',
  },
}

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
  detail?: () => InterviewHistoryDetail
  result?: () => SessionResult
  questions?: () => SessionQuestions
}

/** Dựng trang với một backend giả, trả về danh sách URL đã gọi. */
function setup(id: string, backend: Backend = {}) {
  storage.set(STORAGE_KEYS.accessToken, 'access-token')
  const urls: string[] = []

  apiClient.defaults.adapter = async (config) => {
    urls.push(config.url ?? '')
    const envelope = (data: unknown) => ({
      data: { statusCode: 200, success: true, data, message: 'OK', timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })

    if (config.url?.includes('/interview-session/')) {
      if (!backend.questions) throw httpError(config, 404, 'Questions not found')
      return envelope(backend.questions())
    }
    if (config.url?.includes('/scoring/')) {
      if (!backend.result) throw httpError(config, 404, 'Scoring result not found')
      return envelope(backend.result())
    }
    if (!backend.detail) throw httpError(config, 404, 'Interview not found')
    return envelope(backend.detail())
  }

  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/history/${id}`]}>
        <Routes>
          <Route path="/history/:id" element={<HistoryDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
  return urls
}

test('hiện điểm và nhận xét khi buổi đã chấm xong', async () => {
  const urls = setup(sessionId, { detail: () => detail, result: () => result })

  expect(await screen.findByText('7,4')).toBeInTheDocument()
  expect(screen.getByText('Nắm vững chuyên môn')).toBeInTheDocument()
  expect(screen.getByText('Áp dụng mô hình STAR.')).toBeInTheDocument()
  expect(screen.getByText('nguyen-van-a-cv.pdf')).toBeInTheDocument()
  expect(urls).toContain(`/scoring/sessions/${sessionId}/result`)
})

/**
 * 404 của backend gộp "không tồn tại" và "của người khác", nên đây là một màn
 * hình riêng có đường về danh sách, không phải báo lỗi kèm nút thử lại.
 */
test('404 ra màn không tìm thấy, không phải lỗi tải', async () => {
  setup(sessionId)

  expect(await screen.findByText('Không tìm thấy buổi phỏng vấn')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Tải lại' })).not.toBeInTheDocument()
})

test('id sai định dạng ra màn không tìm thấy mà không gọi API', () => {
  const urls = setup('khong-phai-uuid')

  expect(screen.getByText('Không tìm thấy buổi phỏng vấn')).toBeInTheDocument()
  expect(urls).toHaveLength(0)
})

/**
 * Buổi chưa chấm xong thì endpoint kết quả chỉ trả 400, nên không gọi nó. Người
 * dùng cần biết đang chờ gì, chứ không phải một khối điểm trống.
 */
test('buổi đang chấm thì nói rõ đang chờ và không gọi endpoint kết quả', async () => {
  const urls = setup(sessionId, { detail: () => ({ ...detail, status: 'SCORING' }) })

  expect(await screen.findByText('Hệ thống đang chấm bài')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Kiểm tra lại' })).toBeInTheDocument()
  expect(urls).toContain(`/interviews/${sessionId}`)
  expect(urls.some((url) => url.includes('/scoring/'))).toBe(false)
})

test('buổi chưa nộp thì dẫn vào phòng phỏng vấn', async () => {
  setup(sessionId, { detail: () => ({ ...detail, status: 'CREATED', durationSeconds: null }) })

  expect(await screen.findByText('Buổi phỏng vấn chưa bắt đầu')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Vào phòng' })).toHaveAttribute(
    'href',
    `/interviews/${sessionId}`,
  )
  // Chưa nộp thì không có thời lượng: hiện dấu gạch, không phải 00:00.
  expect(screen.getByText('—')).toBeInTheDocument()
})

test('nói rõ CV không còn thay vì để ô trống', async () => {
  setup(sessionId, { detail: () => ({ ...detail, cv: null }), result: () => result })

  expect(await screen.findByText('Không còn')).toBeInTheDocument()
})

test('buổi bị gắn cờ hiện nhật ký cảnh báo; buổi sạch thì không có khối này', async () => {
  const flagged: InterviewHistoryDetail = {
    ...detail,
    isFlagged: true,
    cheatSummary: {
      totalCount: 2,
      countsByType: { TAB_SWITCH: 1, WINDOW_BLUR: 0, FACE_MISSING: 1, MULTIPLE_FACES: 0 },
    },
    cheatLogs: [
      {
        id: 'a1',
        eventType: 'TAB_SWITCH',
        description: null,
        occurredAt: '2026-10-20T08:05:00.000Z',
        createdAt: '2026-10-20T08:05:01.000Z',
      },
      {
        id: 'a2',
        eventType: 'FACE_MISSING',
        description: 'x',
        occurredAt: '2026-10-20T08:06:00.000Z',
        createdAt: '2026-10-20T08:06:01.000Z',
      },
    ],
  }
  setup(sessionId, { detail: () => flagged, result: () => result })

  expect(await screen.findByText('Cảnh báo trong buổi')).toBeInTheDocument()
  expect(screen.getByText('Rời tab phỏng vấn')).toBeInTheDocument()
  expect(screen.getByText('Không thấy khuôn mặt trong khung hình')).toBeInTheDocument()
})

test('buổi không bị gắn cờ không hiện khối cảnh báo', async () => {
  setup(sessionId, { detail: () => detail, result: () => result })

  await screen.findByText('nguyen-van-a-cv.pdf')
  expect(screen.queryByText('Cảnh báo trong buổi')).not.toBeInTheDocument()
})

test('nhận sự kiện SSE answer-scored thì bắn toast và tải kết quả mới', async () => {
  let currentStatus: InterviewHistoryDetail['status'] = 'SCORING'
  setup(sessionId, {
    detail: () => ({ ...detail, status: currentStatus }),
    result: () => result,
  })

  expect(await screen.findByText('Hệ thống đang chấm bài')).toBeInTheDocument()
  expect(openScoringStream).toHaveBeenCalledTimes(1)

  currentStatus = 'COMPLETED'
  act(() => {
    capturedStreamOptions?.onEvent({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'answer-scored',
      payload: { sessionId, overallScore: 7.4 },
    })
  })

  expect(await screen.findByText('Đã có kết quả chấm điểm')).toBeInTheDocument()
  expect(await screen.findByText('7,4')).toBeInTheDocument()
})

test('nhận sự kiện SSE answer-failed thì bắn toast lỗi và tải lại chi tiết buổi', async () => {
  let currentStatus: InterviewHistoryDetail['status'] = 'SCORING'
  setup(sessionId, {
    detail: () => ({ ...detail, status: currentStatus }),
  })

  expect(await screen.findByText('Hệ thống đang chấm bài')).toBeInTheDocument()

  currentStatus = 'FAILED'
  act(() => {
    capturedStreamOptions?.onEvent({
      userId: 'user-1',
      jobId: 'job-1',
      type: 'answer-failed',
      payload: { sessionId, error: 'AI service is temporarily busy.' },
    })
  })

  expect(await screen.findByText('AI service is temporarily busy.')).toBeInTheDocument()
  expect(
    await screen.findByText('Câu trả lời của bạn vẫn được lưu. Hãy thử kiểm tra lại sau.'),
  ).toBeInTheDocument()
})

test('chỉ reload chi tiết buổi khi SSE reconnect, không gọi trùng lúc mới mở lần đầu', async () => {
  const urls = setup(sessionId, {
    detail: () => ({ ...detail, status: 'SCORING' }),
  })
  // Đếm riêng request chi tiết: buổi này không có câu hỏi nhúng nên trang còn
  // gọi thêm bộ câu hỏi của phiên, so sánh cả mảng url sẽ gãy vì chuyện đó.
  const detailCalls = () => urls.filter((url) => url === `/interviews/${sessionId}`).length

  expect(await screen.findByText('Hệ thống đang chấm bài')).toBeInTheDocument()
  expect(detailCalls()).toBe(1)

  // Lần mở kết nối đầu tiên không phải reconnect: tải lại là gọi trùng.
  act(() => {
    capturedStreamOptions?.onOpen?.(false)
  })
  expect(detailCalls()).toBe(1)

  act(() => {
    capturedStreamOptions?.onOpen?.(true)
  })
  await waitFor(() => expect(detailCalls()).toBe(2))
})

/**
 * API lịch sử chừa sẵn `questions` và đó là nguồn duy nhất có kèm video và
 * transcript, nên khi nó có dữ liệu thì trang không gọi thêm request nào nữa.
 */
test('dùng câu hỏi nhúng trong chi tiết, hiện video và transcript từng câu', async () => {
  const urls = setup(sessionId, {
    detail: () => ({
      ...detail,
      questions: [
        {
          id: 'q-1',
          orderIndex: 1,
          content: 'Giải thích event loop trong Node.js.',
          domain: 'TECHNICAL',
          difficulty: 'HARD',
          answer: {
            videoUrl: 'https://res.cloudinary.com/demo/video/upload/a1.webm',
            transcript: 'Event loop xử lý callback theo từng pha.',
            durationSeconds: 125,
          },
        },
        {
          id: 'q-2',
          orderIndex: 2,
          content: 'Kể về một lần bạn xử lý sự cố production.',
          domain: 'BEHAVIORAL',
          difficulty: 'MEDIUM',
          answer: null,
        },
      ],
    }),
    result: () => result,
  })

  expect(await screen.findByText('Giải thích event loop trong Node.js.')).toBeInTheDocument()
  expect(screen.getByText('Event loop xử lý callback theo từng pha.')).toBeInTheDocument()
  expect(screen.getByLabelText('Video câu trả lời 1')).toHaveAttribute(
    'src',
    'https://res.cloudinary.com/demo/video/upload/a1.webm',
  )
  expect(screen.getByText('Câu này không có bản ghi trả lời.')).toBeInTheDocument()
  expect(urls.some((url) => url.includes('/interview-session/'))).toBe(false)
})

test('chi tiết chưa có câu hỏi thì lấy bộ câu hỏi của phiên và nói rõ thiếu bản ghi', async () => {
  const urls = setup(sessionId, {
    detail: () => detail,
    result: () => result,
    questions: () => ({
      sessionPublicId: sessionId,
      questions: [
        {
          publicId: 'g-1',
          orderIndex: 1,
          content: 'Bạn xử lý xung đột trong nhóm thế nào?',
          domain: 'BEHAVIORAL',
          difficulty: 'EASY',
        },
      ],
    }),
  })

  expect(await screen.findByText('Bạn xử lý xung đột trong nhóm thế nào?')).toBeInTheDocument()
  expect(screen.getByText('Chưa đọc được video và transcript của câu này.')).toBeInTheDocument()
  expect(urls).toContain(`/interview-session/${sessionId}/questions`)
})

// 404 ở đây nghĩa là buổi không có bộ câu hỏi nào đọc được, không phải hệ thống
// lỗi, nên khối này nói ngắn gọn chứ không hiện báo đỏ kèm nút thử lại.
test('không đọc được bộ câu hỏi thì nói gọn, không dựng báo lỗi', async () => {
  setup(sessionId, { detail: () => detail, result: () => result })

  expect(
    await screen.findByText('Không đọc được danh sách câu hỏi của buổi này.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
})

/*
 * Hook kết quả từng bị tắt khi `detail.score` có dữ liệu, để tiết kiệm một
 * request. Backend đổ dữ liệu vào field đó là mọi buổi đã chấm xong hiện ra
 * "Chưa lấy được điểm", vì không nhánh nào đọc `detail.score` cả.
 */
test('buổi đã chấm vẫn hiện điểm khi chi tiết đã kèm sẵn score', async () => {
  const urls = setup(sessionId, {
    detail: () => ({
      ...detail,
      score: {
        contentScore: 8,
        relevanceScore: 7.5,
        confidenceScore: 6.5,
        overallScore: 7.4,
        scoredAt: '2026-10-20T08:14:02.000Z',
      },
      summary: { overallFeedback: 'Tốt', strengths: [], improvements: [] },
    }),
    result: () => result,
  })

  expect(await screen.findByText('7,4')).toBeInTheDocument()
  expect(screen.queryByText('Chưa lấy được điểm')).not.toBeInTheDocument()
  // Endpoint Scoring có biểu đồ cảm xúc và metadata mà API lịch sử không trả.
  expect(urls).toContain(`/scoring/sessions/${sessionId}/result`)
})
