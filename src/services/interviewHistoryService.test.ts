import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, expect, test } from 'vitest'

import { apiClient } from './apiClient'
import { EMPTY_HISTORY_FILTER, interviewHistoryService } from './interviewHistoryService'

import { HISTORY_PAGE_SIZE } from '@/constants/history'
import type { PageResult } from '@/types/api'
import type { InterviewHistoryDetail, InterviewHistoryItem } from '@/types/history'

const emptyPage: PageResult<InterviewHistoryItem> = {
  items: [],
  totalPages: 0,
  currentPage: 1,
  pageNumber: 1,
  pageSize: HISTORY_PAGE_SIZE,
  hasPrevious: false,
  hasNext: false,
}

const detail: InterviewHistoryDetail = {
  id: '3f1c2b9e-8a4d-4f6b-9c1e-2d7a5b0e4f11',
  title: 'Backend Intern - NestJS',
  jobDescription: null,
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
}

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

/** Giả backend: ghi lại request rồi trả về envelope thành công. */
function recordRequests(data: unknown): InternalAxiosRequestConfig[] {
  const requests: InternalAxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    return {
      data: { statusCode: 200, success: true, data, message: 'OK', timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  return requests
}

/**
 * Chuỗi rỗng là bẫy ở đây: axios bỏ qua param undefined nhưng vẫn gửi
 * `?status=`, mà chuỗi rỗng không thuộc enum của backend nên "bỏ lọc" lại thành
 * lỗi 400. Test này vỡ nếu ai đó truyền thẳng bộ lọc vào params.
 */
test('chỉ gửi phân trang khi không lọc gì', async () => {
  const requests = recordRequests(emptyPage)

  await interviewHistoryService.list()

  expect(requests).toHaveLength(1)
  expect(requests[0].method).toBe('get')
  expect(requests[0].url).toBe('/interviews')
  expect(requests[0].params).toEqual({ pageNumber: 1, pageSize: HISTORY_PAGE_SIZE })
})

test('đổi mốc ngày của ô date thành ISO trọn ngày theo giờ địa phương', async () => {
  const requests = recordRequests(emptyPage)

  await interviewHistoryService.list(2, {
    status: 'COMPLETED',
    fromDate: '2026-10-01',
    toDate: '2026-10-31',
  })

  expect(requests[0].params).toEqual({
    pageNumber: 2,
    pageSize: HISTORY_PAGE_SIZE,
    status: 'COMPLETED',
    fromDate: new Date(2026, 9, 1, 0, 0, 0, 0).toISOString(),
    toDate: new Date(2026, 9, 31, 23, 59, 59, 999).toISOString(),
  })
})

test('không gửi pageSize vượt mức 100 mà backend chặn', async () => {
  const requests = recordRequests(emptyPage)

  await interviewHistoryService.list(1, EMPTY_HISTORY_FILTER)

  expect(requests[0].params.pageSize).toBeLessThanOrEqual(100)
})

test('chặn khoảng ngày đảo chiều ngay ở frontend, không gọi mạng', async () => {
  const requests = recordRequests(emptyPage)

  await expect(
    interviewHistoryService.list(1, {
      status: '',
      fromDate: '2026-10-31',
      toDate: '2026-10-01',
    }),
  ).rejects.toMatchObject({ status: 0, message: '"Từ ngày" phải trước hoặc bằng "Đến ngày"' })
  expect(requests).toHaveLength(0)
})

test('lấy chi tiết theo publicId và trả về nguyên payload của backend', async () => {
  const requests = recordRequests(detail)

  const result = await interviewHistoryService.getById(detail.id)

  expect(requests[0].url).toBe(`/interviews/${detail.id}`)
  expect(result.cv?.fileName).toBe('nguyen-van-a-cv.pdf')
  // Ba field khung của backend phải đi qua service y nguyên, không bị dựng mặc định.
  expect(result.score).toBeNull()
  expect(result.summary).toBeNull()
  expect(result.questions).toEqual([])
})
