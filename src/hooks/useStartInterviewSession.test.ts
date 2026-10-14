import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { useStartInterviewSession } from './useStartInterviewSession'

import { interviewService } from '@/services/interviewService'
import { deferred } from '@/test/interviewFixtures'
import { session, startedSession } from '@/test/sessionFixtures'
import type { InterviewSessionStatus } from '@/types/interview'

test('rechecks state and UUID in the handler before any network request', async () => {
  const post = vi.spyOn(interviewService, 'startSession')
  const onStarted = vi.fn()
  const { result } = renderHook(() =>
    useStartInterviewSession({ reload: async () => {}, onStarted }),
  )
  const states: InterviewSessionStatus[] = [
    'IN_PROGRESS',
    'SUBMITTED',
    'SCORING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ]
  await act(async () => {
    for (const status of states) await result.current.start({ ...session, status })
    await result.current.start({ ...session, sessionPublicId: 'bad-id' })
  })
  expect(post).not.toHaveBeenCalled()
  expect(onStarted).not.toHaveBeenCalled()
})

test('ref locks multiple starts in one render and does not restart a successful session using a stale callback', async () => {
  const pending = deferred<typeof startedSession>()
  const post = vi.spyOn(interviewService, 'startSession').mockReturnValue(pending.promise)
  const onStarted = vi.fn()
  const { result } = renderHook(() =>
    useStartInterviewSession({ reload: async () => {}, onStarted }),
  )
  const staleStart = result.current.start
  await act(async () => {
    void staleStart(session)
    void staleStart(session)
  })
  expect(post).toHaveBeenCalledTimes(1)
  expect(result.current.isLocked).toBe(true)
  await act(async () => pending.resolve(startedSession))
  await act(async () => staleStart(session))
  expect(post).toHaveBeenCalledTimes(1)
  expect(onStarted).toHaveBeenCalledWith({ ...session, ...startedSession })
})

test('failed conflict synchronization keeps even stale callbacks blocked; successful retry unlocks CREATED', async () => {
  const post = vi
    .spyOn(interviewService, 'startSession')
    .mockRejectedValueOnce({ status: 409 })
    .mockResolvedValue(startedSession)
  const sync = deferred<void>()
  const reload = vi.fn().mockReturnValueOnce(sync.promise).mockResolvedValue(undefined)
  const onStarted = vi.fn()
  const { result } = renderHook(() => useStartInterviewSession({ reload, onStarted }))
  const staleStart = result.current.start
  await act(async () => {
    void staleStart(session)
  })
  expect(result.current.startingId).toBeNull()
  expect(result.current.isSynchronizing).toBe(true)
  await act(async () => {
    void staleStart(session)
  })
  expect(post).toHaveBeenCalledTimes(1)
  await act(async () => sync.reject(new Error('Cannot synchronize')))
  await act(async () => staleStart(session))
  expect(result.current.isLocked).toBe(true)
  expect(post).toHaveBeenCalledTimes(1)
  await act(async () => result.current.retryLoad())
  expect(result.current.isLocked).toBe(false)
  await act(async () => result.current.start(session))
  expect(onStarted).toHaveBeenCalledWith({ ...session, ...startedSession })
})
