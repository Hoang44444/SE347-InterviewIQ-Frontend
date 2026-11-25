import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { DashboardPage } from './DashboardPage'

import { STORAGE_KEYS } from '@/constants'
import { apiClient } from '@/services/apiClient'
import type { HistoryInsightState, InterviewStats, InterviewStatsSession } from '@/types/dashboard'
import { storage } from '@/utils/storage'

// Trang chỉ đọc tên để chào; không cần dựng cả AuthProvider (nó tự gọi /users/me).
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { fullName: 'Lê Văn An' } }) }))

function session(day: number, overallScore: number, title = `Buổi ${day}`): InterviewStatsSession {
  return {
    id: `00000000-0000-4000-8000-0000000000${String(day).padStart(2, '0')}`,
    title,
    createdAt: `2026-10-${String(day).padStart(2, '0')}T08:00:00.000Z`,
    contentScore: overallScore,
    relevanceScore: overallScore,
    confidenceScore: overallScore,
    overallScore,
  }
}

const emptyStats: InterviewStats = {
  maxScore: 10,
  completedSessions: 0,
  answeredQuestions: 0,
  averages: null,
  best: null,
  trend: [],
  comparison: null,
}

const latest = session(20, 7.4, 'Backend Intern')
const previous = session(10, 7.1, 'Java Fresher')
const scoredStats: InterviewStats = {
  maxScore: 10,
  completedSessions: 3,
  answeredQuestions: 14,
  averages: { contentScore: 6.7, relevanceScore: 6.5, confidenceScore: 5.8, overallScore: 6.4 },
  best: latest,
  trend: [session(2, 4.8), previous, latest],
  comparison: {
    latest,
    previous,
    delta: { contentScore: 0.5, relevanceScore: 0.7, confidenceScore: -0.5, overallScore: 0.3 },
  },
}

const insight = {
  overallFeedback: 'Điểm nội dung tăng đều, phần trình bày vẫn là điểm yếu lặp lại.',
  strengths: [{ category: 'TECHNICAL_KNOWLEDGE', title: 'Nền tảng vững', description: 'DI rõ' }],
  weaknesses: [{ category: 'COMMUNICATION', title: 'Thiếu ví dụ STAR', description: 'Lý thuyết' }],
  recommendations: [{ title: 'Luyện STAR', description: 'Chuẩn bị 3 câu chuyện' }],
  basedOnSessionCount: 3,
  generatedAt: '2026-10-21T00:00:00.000Z',
}

function insightState(overrides: Partial<HistoryInsightState> = {}): HistoryInsightState {
  return {
    completedSessions: 3,
    minCompletedSessions: 2,
    canGenerate: true,
    isStale: false,
    insight,
    ...overrides,
  }
}

type Reply = { status: number; data: unknown }

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

/** Backend giả trả lời theo method + url; trả về danh sách request đã gửi. */
function setup(routes: Record<string, () => Reply>) {
  storage.set(STORAGE_KEYS.accessToken, 'access-token')
  const calls: string[] = []

  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const key = `${config.method?.toUpperCase()} ${config.url}`
    calls.push(key)
    const reply = routes[key]?.() ?? { status: 404, data: { message: 'Not found' } }
    if (reply.status >= 400) {
      return Promise.reject(
        Object.assign(new Error('Request failed'), {
          isAxiosError: true,
          config,
          response: { status: reply.status, data: reply.data, headers: {}, config },
        }),
      )
    }
    return {
      data: { statusCode: 200, success: true, data: reply.data, message: 'OK', timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
  return calls
}

const ok = (data: unknown) => () => ({ status: 200, data })

test('lịch sử rỗng: số 0, mời luyện tập và chưa cho tạo nhận xét', async () => {
  setup({
    'GET /interviews/stats': ok(emptyStats),
    'GET /interviews/insight': ok(
      insightState({ completedSessions: 0, canGenerate: false, insight: null }),
    ),
  })

  expect(await screen.findByText('Chưa có buổi nào được chấm điểm')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Bắt đầu luyện tập' })).toHaveAttribute(
    'href',
    '/interviews',
  )
  expect(await screen.findByText(/Cần ít nhất 2 buổi đã chấm xong/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Tạo nhận xét' })).not.toBeInTheDocument()
  expect(screen.queryByRole('img', { name: /Xu hướng điểm/ })).not.toBeInTheDocument()
})

test('có điểm: ô số liệu, hai biểu đồ, chênh lệch và nhận xét đã lưu', async () => {
  setup({
    'GET /interviews/stats': ok(scoredStats),
    'GET /interviews/insight': ok(insightState()),
  })

  expect(
    await screen.findByRole('img', { name: 'Xu hướng điểm của 3 buổi gần nhất' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /So sánh theo tiêu chí/ })).toBeInTheDocument()
  expect(screen.getByText('6,4')).toBeInTheDocument()
  expect(screen.getByText('14')).toBeInTheDocument()
  expect(screen.getByText('+0,3')).toBeInTheDocument()
  expect(screen.getByText('-0,5')).toBeInTheDocument()

  expect(await screen.findByText(insight.overallFeedback)).toBeInTheDocument()
  expect(screen.getByText('Thiếu ví dụ STAR')).toBeInTheDocument()
  // Nhận xét còn đúng với lịch sử: không có nút tạo lại
  expect(screen.queryByRole('button', { name: /nhận xét/ })).not.toBeInTheDocument()
})

test('đổi mốc so sánh của radar sang một buổi cụ thể', async () => {
  setup({
    'GET /interviews/stats': ok(scoredStats),
    'GET /interviews/insight': ok(insightState()),
  })

  const select = await screen.findByLabelText('So với')
  fireEvent.change(select, { target: { value: previous.id } })

  const radar = screen.getByRole('img', { name: /So sánh theo tiêu chí/ })
  expect(radar).toHaveAccessibleName(/Buổi 10\/10: Nội dung 7,1/)
  expect(screen.getByText('Buổi 10/10', { selector: 'li' })).toBeInTheDocument()
})

test('bấm "Tạo nhận xét" thì gọi POST và hiện nhận xét mới', async () => {
  const calls = setup({
    'GET /interviews/stats': ok(scoredStats),
    'GET /interviews/insight': ok(insightState({ insight: null })),
    'POST /interviews/insight': ok(insightState()),
  })

  fireEvent.click(await screen.findByRole('button', { name: 'Tạo nhận xét' }))

  expect(await screen.findByText(insight.overallFeedback)).toBeInTheDocument()
  expect(calls).toContain('POST /interviews/insight')
})

test('nhận xét cũ thì có nút cập nhật; hết lượt thì báo bằng tiếng Việt và giữ bản cũ', async () => {
  setup({
    'GET /interviews/stats': ok(scoredStats),
    'GET /interviews/insight': ok(insightState({ isStale: true, completedSessions: 4 })),
    'POST /interviews/insight': () => ({
      status: 429,
      data: { message: 'Too many insight requests, please try again later' },
    }),
  })

  expect(await screen.findByText('Có buổi mới từ lần tạo trước')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cập nhật nhận xét' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(/Hãy thử lại sau ít phút/)
  expect(screen.getByText(insight.overallFeedback)).toBeInTheDocument()
})

test('tải thống kê lỗi thì có nút thử lại', async () => {
  let fail = true
  const calls = setup({
    'GET /interviews/stats': () =>
      fail ? { status: 500, data: { message: 'boom' } } : { status: 200, data: emptyStats },
    'GET /interviews/insight': ok(insightState()),
  })

  const error = await screen.findByText('Chưa tải được thống kê điểm. Hãy thử lại.')
  fail = false
  const card = error.parentElement as HTMLElement
  fireEvent.click(within(card).getByRole('button', { name: 'Thử lại' }))

  expect(await screen.findByText('Chưa có buổi nào được chấm điểm')).toBeInTheDocument()
  await waitFor(() =>
    expect(calls.filter((call) => call === 'GET /interviews/stats')).toHaveLength(2),
  )
})
