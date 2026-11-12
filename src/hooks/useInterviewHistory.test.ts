import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { useInterviewHistory } from './useInterviewHistory'

import { interviewHistoryService } from '@/services/interviewHistoryService'
import { deferred } from '@/test/interviewFixtures'
import type { PageResult } from '@/types/api'
import type { InterviewHistoryItem } from '@/types/history'

vi.mock('@/services/interviewHistoryService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/interviewHistoryService')>()
  return { ...actual, interviewHistoryService: { list: vi.fn(), getById: vi.fn() } }
})

type HistoryPage = PageResult<InterviewHistoryItem>

function pageOf(title: string, currentPage = 1): HistoryPage {
  return {
    items: [
      {
        id: '3f1c2b9e-8a4d-4f6b-9c1e-2d7a5b0e4f11',
        title,
        status: 'COMPLETED',
        totalQuestions: 5,
        durationSeconds: 842,
        overallScore: 7.5,
        startedAt: null,
        completedAt: null,
        createdAt: '2026-10-20T07:58:11.000Z',
        isFlagged: false,
        cheatEventCount: 0,
      },
    ],
    totalPages: 3,
    currentPage,
    pageNumber: currentPage,
    pageSize: 20,
    hasPrevious: currentPage > 1,
    hasNext: true,
  }
}

const list = () => vi.mocked(interviewHistoryService.list)

/**
 * Đang ở trang 3 mà đổi lọc thì bộ lọc mới có thể chỉ có một trang, backend trả
 * về trang rỗng và người dùng tưởng là không có dữ liệu. Lọc phải kéo về trang 1.
 */
test('đổi lọc thì quay về trang 1', async () => {
  list().mockResolvedValue(pageOf('buổi cũ'))
  const { result } = renderHook(() => useInterviewHistory())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  act(() => result.current.changePage(3))
  await waitFor(() => expect(list()).toHaveBeenLastCalledWith(3, expect.anything()))

  act(() => result.current.applyFilter({ status: 'COMPLETED', fromDate: '', toDate: '' }))

  await waitFor(() =>
    expect(list()).toHaveBeenLastCalledWith(1, {
      status: 'COMPLETED',
      fromDate: '',
      toDate: '',
    }),
  )
  expect(result.current.pageNumber).toBe(1)
})

test('xoá lọc đưa bộ lọc về rỗng và cũng về trang 1', async () => {
  list().mockResolvedValue(pageOf('buổi cũ'))
  const { result } = renderHook(() => useInterviewHistory())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  act(() => result.current.applyFilter({ status: 'FAILED', fromDate: '2026-10-01', toDate: '' }))
  await waitFor(() => expect(result.current.filter.status).toBe('FAILED'))

  act(() => result.current.clearFilter())

  await waitFor(() =>
    expect(result.current.filter).toEqual({ status: '', fromDate: '', toDate: '' }),
  )
  expect(result.current.pageNumber).toBe(1)
})

/** Đổi lọc nhanh tay: response của lần lọc trước về sau thì phải bị bỏ. */
test('bỏ qua response đến muộn của lần lọc trước', async () => {
  const slow = deferred<HistoryPage>()
  const fast = deferred<HistoryPage>()
  list().mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

  const { result } = renderHook(() => useInterviewHistory())
  act(() => result.current.applyFilter({ status: 'COMPLETED', fromDate: '', toDate: '' }))

  await act(async () => {
    fast.resolve(pageOf('kết quả mới'))
    await Promise.resolve()
  })
  expect(result.current.items[0].title).toBe('kết quả mới')

  await act(async () => {
    slow.resolve(pageOf('kết quả cũ'))
    await Promise.resolve()
  })
  expect(result.current.items[0].title).toBe('kết quả mới')
  expect(result.current.isLoading).toBe(false)
})

test('giữ danh sách cũ khi tải lỗi và hiện thông báo để thử lại', async () => {
  list()
    .mockResolvedValueOnce(pageOf('buổi cũ'))
    .mockRejectedValueOnce({ status: 500, message: 'Failed to load the interview history' })

  const { result } = renderHook(() => useInterviewHistory())
  await waitFor(() => expect(result.current.items).toHaveLength(1))

  act(() => result.current.changePage(2))

  await waitFor(() => expect(result.current.loadError).toContain('Failed to load'))
  expect(result.current.items[0].title).toBe('buổi cũ')
  expect(result.current.isLoading).toBe(false)
})
