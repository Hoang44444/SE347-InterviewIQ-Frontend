import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test } from 'vitest'

import { HistoryPage } from './HistoryPage'

import { STORAGE_KEYS } from '@/constants'
import { HISTORY_PAGE_SIZE } from '@/constants/history'
import { apiClient } from '@/services/apiClient'
import type { PageResult } from '@/types/api'
import type { InterviewHistoryItem } from '@/types/history'
import { storage } from '@/utils/storage'

const completed: InterviewHistoryItem = {
  id: '3f1c2b9e-8a4d-4f6b-9c1e-2d7a5b0e4f11',
  title: 'Backend Intern - NestJS',
  status: 'COMPLETED',
  totalQuestions: 5,
  durationSeconds: 842,
  overallScore: 7.5,
  startedAt: '2026-10-20T08:00:00.000Z',
  completedAt: '2026-10-20T08:14:02.000Z',
  createdAt: '2026-10-20T07:58:11.000Z',
}

const created: InterviewHistoryItem = {
  id: '4a2d3c0f-9b5e-4a7c-8d2f-3e8b6c1f5a22',
  title: 'Frontend React',
  status: 'CREATED',
  totalQuestions: 8,
  durationSeconds: null,
  overallScore: null,
  startedAt: null,
  completedAt: null,
  createdAt: '2026-10-19T02:12:00.000Z',
}

function pageOf(items: InterviewHistoryItem[]): PageResult<InterviewHistoryItem> {
  return {
    items,
    totalPages: 1,
    currentPage: 1,
    pageNumber: 1,
    pageSize: HISTORY_PAGE_SIZE,
    hasPrevious: false,
    hasNext: false,
  }
}

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

/** Dựng trang với backend giả; trả về params của từng request đã gửi. */
function setup(respond: (params: Record<string, unknown>) => InterviewHistoryItem[]) {
  storage.set(STORAGE_KEYS.accessToken, 'access-token')
  const calls: Record<string, unknown>[] = []

  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const params = (config.params ?? {}) as Record<string, unknown>
    calls.push(params)
    return {
      data: {
        statusCode: 200,
        success: true,
        data: pageOf(respond(params)),
        message: 'OK',
        timestamp: '',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  )
  return calls
}

test('mỗi buổi dẫn tới đích khớp trạng thái của nó', async () => {
  setup(() => [completed, created])

  // Buổi đã xong thì xem kết quả, buổi chưa nộp thì vào phòng làm tiếp.
  expect(await screen.findByRole('link', { name: 'Xem kết quả' })).toHaveAttribute(
    'href',
    `/history/${completed.id}`,
  )
  expect(screen.getByRole('link', { name: 'Vào phòng' })).toHaveAttribute(
    'href',
    `/interviews/${created.id}`,
  )

  expect(screen.getByText('7,5')).toBeInTheDocument()
  // Buổi chưa nộp: không có điểm và không có thời lượng, cả hai là dấu gạch.
  expect(screen.getAllByText('—')).toHaveLength(2)
})

/**
 * Khoảng ngày đảo chiều bị backend trả 400. Chặn ở frontend để lỗi hiện ngay
 * cạnh ô ngày thay vì thành một thông báo chung chung ở đầu trang.
 */
test('khoảng ngày đảo chiều: lỗi hiện cạnh ô nhập và không gọi thêm request', async () => {
  const calls = setup(() => [completed])
  await screen.findByText('Backend Intern - NestJS')

  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-31' } })
  await waitFor(() => expect(calls).toHaveLength(2))

  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-01' } })

  expect(await screen.findByText('"Từ ngày" phải trước hoặc bằng "Đến ngày"')).toBeInTheDocument()
  expect(screen.queryByText(/Chưa tải được lịch sử/)).not.toBeInTheDocument()
  // Danh sách cũ còn đó để người dùng sửa lại mốc ngày, và không có request thứ ba.
  expect(screen.getByText('Backend Intern - NestJS')).toBeInTheDocument()
  expect(calls).toHaveLength(2)
})

test('lọc trạng thái gửi đúng enum và báo rõ khi không có kết quả', async () => {
  const calls = setup((params) => (params.status === 'FAILED' ? [] : [completed]))
  await screen.findByText('Backend Intern - NestJS')

  fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'FAILED' } })

  expect(await screen.findByText('Không có buổi nào khớp bộ lọc')).toBeInTheDocument()
  expect(calls[1]).toMatchObject({ pageNumber: 1, status: 'FAILED' })

  fireEvent.click(screen.getByRole('button', { name: 'Bỏ lọc để xem tất cả' }))

  expect(await screen.findByText('Backend Intern - NestJS')).toBeInTheDocument()
  expect(calls[2]).toEqual({ pageNumber: 1, pageSize: HISTORY_PAGE_SIZE })
})

test('tài khoản chưa có buổi nào thì mời tạo buổi đầu tiên', async () => {
  setup(() => [])

  expect(await screen.findByText('Chưa có buổi phỏng vấn nào')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Tạo buổi phỏng vấn' })).toBeInTheDocument()
})
