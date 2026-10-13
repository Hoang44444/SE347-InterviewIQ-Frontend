import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { useScoringJob } from './useScoringJob'

import { deferred } from '@/test/interviewFixtures'
import { roomService } from '@/test/roomService'
import type { ScoringJob } from '@/types/interview'

const job: ScoringJob = {
  jobId: 'job',
  sessionId: 'session',
  status: 'PROCESSING',
  createdAt: '2026-10-12T10:00:00.000Z',
  completedAt: null,
}

test.each(['COMPLETED', 'FAILED'] as const)(
  'polls every 3 seconds and stops at %s',
  async (status) => {
    vi.useFakeTimers()
    const service = roomService()
    vi.mocked(service.getScoringJobStatus)
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce({ ...job, status })
    const { result } = renderHook(() => useScoringJob('job', service))
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.job?.status).toBe('PROCESSING')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2999)
    })
    expect(service.getScoringJobStatus).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current.job?.status).toBe(status)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000)
    })
    expect(service.getScoringJobStatus).toHaveBeenCalledTimes(2)
  },
)

test('never overlaps slow status requests and aborts on unmount', async () => {
  vi.useFakeTimers()
  const service = roomService()
  const pending = deferred<ScoringJob>()
  vi.mocked(service.getScoringJobStatus).mockReturnValue(pending.promise)
  const { unmount } = renderHook(() => useScoringJob('job', service))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(12000)
  })
  expect(service.getScoringJobStatus).toHaveBeenCalledTimes(1)
  const signal = vi.mocked(service.getScoringJobStatus).mock.calls[0][1]!
  expect(signal.aborted).toBe(false)
  unmount()
  expect(signal.aborted).toBe(true)
  await act(async () => {
    pending.resolve(job)
    await vi.advanceTimersByTimeAsync(6000)
  })
  expect(service.getScoringJobStatus).toHaveBeenCalledTimes(1)
})

test.each([0, 500])(
  'keeps current job on HTTP %s polling error and resumes only on manual check',
  async (status) => {
    vi.useFakeTimers()
    const service = roomService()
    vi.mocked(service.getScoringJobStatus)
      .mockResolvedValueOnce(job)
      .mockRejectedValueOnce({ status, message: 'Status unavailable' })
      .mockResolvedValueOnce({ ...job, status: 'COMPLETED' })
    const { result } = renderHook(() => useScoringJob('job', service))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(result.current.error).toContain('Status unavailable')
    expect(result.current.job?.jobId).toBe('job')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000)
    })
    expect(service.getScoringJobStatus).toHaveBeenCalledTimes(2)
    await act(async () => {
      result.current.checkAgain()
      await Promise.resolve()
    })
    expect(result.current.job?.status).toBe('COMPLETED')
    expect(result.current.error).toBe('')
  },
)

test('does not poll before submission and cancels scheduled polling on leave', async () => {
  vi.useFakeTimers()
  const service = roomService()
  const { rerender, unmount } = renderHook(
    ({ jobId }: { jobId: string | null }) => useScoringJob(jobId, service),
    { initialProps: { jobId: null as string | null } },
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(6000)
  })
  expect(service.getScoringJobStatus).not.toHaveBeenCalled()
  rerender({ jobId: 'job' })
  await act(async () => {
    await Promise.resolve()
  })
  unmount()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(9000)
  })
  expect(service.getScoringJobStatus).toHaveBeenCalledTimes(1)
})
