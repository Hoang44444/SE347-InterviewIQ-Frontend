import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { useQuestionBank } from './useQuestionBank'

import { BANK_PAGE_SIZE, BANK_SEARCH_DEBOUNCE_MS } from '@/constants/questionBank'
import { questionBankService } from '@/services/questionBankService'
import { deferred } from '@/test/interviewFixtures'
import { bankItems, bankPage } from '@/test/questionBankFixtures'
import type { BankPage } from '@/types/questionBank'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('loads the first page with pagination only', async () => {
  const list = vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  const { result } = renderHook(() => useQuestionBank())
  expect(result.current.isLoading).toBe(true)
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.items).toHaveLength(4)
  expect(list).toHaveBeenCalledWith(1, { domain: '', difficulty: '', search: '' }, BANK_PAGE_SIZE)
})

test('changing a filter goes back to page 1', async () => {
  const list = vi
    .spyOn(questionBankService, 'list')
    .mockImplementation(async (pageNumber = 1) => bankPage(bankItems, pageNumber, 3))
  const { result } = renderHook(() => useQuestionBank())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  act(() => result.current.changePage(3))
  await waitFor(() => expect(result.current.page?.currentPage).toBe(3))

  act(() => result.current.setDomain('BEHAVIORAL'))
  await waitFor(() => expect(result.current.page?.currentPage).toBe(1))
  expect(list).toHaveBeenLastCalledWith(
    1,
    { domain: 'BEHAVIORAL', difficulty: '', search: '' },
    BANK_PAGE_SIZE,
  )

  act(() => result.current.changePage(2))
  await waitFor(() => expect(result.current.page?.currentPage).toBe(2))
  act(() => result.current.setDifficulty('HARD'))
  await waitFor(() => expect(result.current.page?.currentPage).toBe(1))
  expect(list).toHaveBeenLastCalledWith(
    1,
    { domain: 'BEHAVIORAL', difficulty: 'HARD', search: '' },
    BANK_PAGE_SIZE,
  )
})

test('debounces the search box: one request after the user stops typing', async () => {
  vi.useFakeTimers()
  const list = vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  const { result } = renderHook(() => useQuestionBank())
  await act(async () => {})
  expect(list).toHaveBeenCalledTimes(1)

  act(() => result.current.setSearchText('t'))
  act(() => vi.advanceTimersByTime(BANK_SEARCH_DEBOUNCE_MS - 50))
  act(() => result.current.setSearchText('th'))
  act(() => vi.advanceTimersByTime(BANK_SEARCH_DEBOUNCE_MS - 50))
  act(() => result.current.setSearchText('thread'))
  expect(result.current.searchText).toBe('thread')
  expect(list).toHaveBeenCalledTimes(1)

  await act(async () => {
    vi.advanceTimersByTime(BANK_SEARCH_DEBOUNCE_MS)
  })
  expect(list).toHaveBeenCalledTimes(2)
  expect(list).toHaveBeenLastCalledWith(
    1,
    { domain: '', difficulty: '', search: 'thread' },
    BANK_PAGE_SIZE,
  )
})

test('a slower response of an older filter never overwrites a newer one', async () => {
  const slow = deferred<BankPage>()
  const fast = bankPage([bankItems[1]])
  vi.spyOn(questionBankService, 'list')
    .mockResolvedValueOnce(bankPage())
    .mockReturnValueOnce(slow.promise)
    .mockResolvedValueOnce(fast)
  const { result } = renderHook(() => useQuestionBank())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  act(() => result.current.setDomain('TECHNICAL'))
  act(() => result.current.setDomain('BEHAVIORAL'))
  await waitFor(() => expect(result.current.items).toHaveLength(1))
  await act(async () => slow.resolve(bankPage([bankItems[0], bankItems[3]])))
  expect(result.current.items).toEqual([bankItems[1]])
})

test('keeps the previous list when a load fails and recovers on reload', async () => {
  const list = vi
    .spyOn(questionBankService, 'list')
    .mockResolvedValueOnce(bankPage())
    .mockRejectedValueOnce({ status: 500, message: 'boom' })
    .mockResolvedValue(bankPage([bankItems[0]]))
  const { result } = renderHook(() => useQuestionBank())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  act(() => result.current.setDomain('TECHNICAL'))
  await waitFor(() => expect(result.current.loadError).not.toBe(''))
  expect(result.current.loadError).toMatch(/Máy chủ đang gặp sự cố/)
  expect(result.current.items).toHaveLength(4)

  act(() => result.current.reload())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.loadError).toBe('')
  expect(result.current.items).toHaveLength(1)
  expect(list).toHaveBeenCalledTimes(3)
})

test('remove sends one request for a double click and reloads afterwards', async () => {
  const list = vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  const pending = deferred<void>()
  const remove = vi.spyOn(questionBankService, 'remove').mockReturnValue(pending.promise)
  const { result } = renderHook(() => useQuestionBank())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  const stale = result.current.remove
  let first: Awaited<ReturnType<typeof stale>>
  let second: Awaited<ReturnType<typeof stale>>
  await act(async () => {
    const a = stale(bankItems[0])
    const b = stale(bankItems[0])
    expect(result.current.deletingId).toBe(null)
    await Promise.resolve()
    pending.resolve()
    first = await a
    second = await b
  })
  expect(remove).toHaveBeenCalledTimes(1)
  expect(remove).toHaveBeenCalledWith(bankItems[0].id)
  expect(first!).toEqual({ ok: true })
  expect(second!).toBeUndefined()
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  expect(result.current.deletingId).toBeNull()
})

test('shows the deleting id while the request runs', async () => {
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  const pending = deferred<void>()
  vi.spyOn(questionBankService, 'remove').mockReturnValue(pending.promise)
  const { result } = renderHook(() => useQuestionBank())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  act(() => void result.current.remove(bankItems[1]))
  expect(result.current.deletingId).toBe(bankItems[1].id)
  await act(async () => pending.resolve())
  expect(result.current.deletingId).toBeNull()
})

test('a failed delete reports the error, keeps the list and does not reload', async () => {
  const list = vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  vi.spyOn(questionBankService, 'remove').mockRejectedValue({ status: 500, message: 'x' })
  const { result } = renderHook(() => useQuestionBank())
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  let outcome: Awaited<ReturnType<typeof result.current.remove>>
  await act(async () => {
    outcome = await result.current.remove(bankItems[0])
  })
  expect(outcome!).toMatchObject({ ok: false, error: { kind: 'server' } })
  expect(result.current.items).toHaveLength(4)
  expect(list).toHaveBeenCalledTimes(1)
})

test('deleting the only item of a later page steps back one page', async () => {
  const list = vi
    .spyOn(questionBankService, 'list')
    .mockImplementation(async (pageNumber = 1) =>
      pageNumber === 2 ? bankPage([bankItems[0]], 2, 2) : bankPage(bankItems, 1, 2),
    )
  vi.spyOn(questionBankService, 'remove').mockResolvedValue()
  const { result } = renderHook(() => useQuestionBank())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  act(() => result.current.changePage(2))
  await waitFor(() => expect(result.current.page?.currentPage).toBe(2))

  await act(async () => {
    await result.current.remove(bankItems[0])
  })
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(1, expect.anything(), BANK_PAGE_SIZE))
})

test('401 on delete is left to the client redirect', async () => {
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  vi.spyOn(questionBankService, 'remove').mockRejectedValue({ status: 401, message: 'x' })
  const { result } = renderHook(() => useQuestionBank())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  let outcome: Awaited<ReturnType<typeof result.current.remove>> | 'unset' = 'unset'
  await act(async () => {
    outcome = await result.current.remove(bankItems[0])
  })
  expect(outcome).toBeUndefined()
})
