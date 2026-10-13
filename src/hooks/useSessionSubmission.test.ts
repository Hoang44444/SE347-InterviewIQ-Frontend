import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { useSessionSubmission } from './useSessionSubmission'

import { answer, deferred } from '@/test/interviewFixtures'
import { roomService } from '@/test/roomService'
import type { SubmitInterviewSessionResult } from '@/types/interview'
import { createInterviewClock } from '@/utils/interviewClock'

const eligible = {
  cvPublicId: 'cv',
  questionIds: ['one'],
  savedAnswers: { one: answer },
  isPending: false,
}

test.each([
  { ...eligible, cvPublicId: undefined },
  { ...eligible, savedAnswers: {} },
  { ...eligible, questionIds: ['one', 'two'] },
  { ...eligible, questionIds: [] },
  { ...eligible, isPending: true },
])('blocks submission without all saved answers, CV or idle state', async (input) => {
  const service = roomService()
  const clock = createInterviewClock(() => 0)
  clock.start('one')
  const { result } = renderHook(() => useSessionSubmission('session', service, clock))
  await act(async () => {
    expect(await result.current.submit(input)).toBeNull()
  })
  expect(service.finishSession).not.toHaveBeenCalled()
  expect(result.current.timing).toBeNull()
})

test('freezes timing/payload and locks answers after failed submission, retries only submit', async () => {
  let now = 0
  const clock = createInterviewClock(() => now)
  clock.start('one')
  now = 420_000
  const service = roomService()
  vi.mocked(service.finishSession).mockRejectedValueOnce({
    status: 500,
    message: 'Queue failed after persistence',
  })
  const { result } = renderHook(() => useSessionSubmission('session', service, clock))
  await act(async () => {
    await result.current.submit(eligible)
  })
  expect(result.current.timing?.durationSeconds).toBe(420)
  expect(result.current.error).toContain('Queue failed')
  expect(result.current.canRetry).toBe(true)
  now = 900_000
  expect(clock.snapshot().sessionSeconds).toBe(420)
  await act(async () => {
    await result.current.submit({ ...eligible, cvPublicId: 'changed', questionIds: ['changed'] })
  })
  expect(service.finishSession).toHaveBeenNthCalledWith(1, 'session', {
    cvPublicId: 'cv',
    totalQuestions: 1,
    durationSeconds: 420,
  })
  expect(service.finishSession).toHaveBeenNthCalledWith(2, 'session', {
    cvPublicId: 'cv',
    totalQuestions: 1,
    durationSeconds: 420,
  })
  expect(result.current.submission).toEqual({
    sessionPublicId: 'session',
    jobId: 'job',
    status: 'QUEUED',
  })
  expect(service.uploadAnswerVideo).not.toHaveBeenCalled()
})

test('does not duplicate submission while pending or after 202', async () => {
  const service = roomService()
  const response = deferred<SubmitInterviewSessionResult>()
  vi.mocked(service.finishSession).mockReturnValue(response.promise)
  const clock = createInterviewClock(() => 0)
  clock.start('one')
  const { result } = renderHook(() => useSessionSubmission('session', service, clock))
  let submitting!: Promise<SubmitInterviewSessionResult | null>
  await act(async () => {
    submitting = result.current.submit(eligible)
    await result.current.submit(eligible)
  })
  expect(result.current.isSubmitting).toBe(true)
  await act(async () => {
    response.resolve({ sessionPublicId: 'session', jobId: 'job', status: 'QUEUED' })
    await submitting
  })
  await act(async () => {
    await result.current.submit(eligible)
  })
  expect(service.finishSession).toHaveBeenCalledTimes(1)
})

test('409 is a conflict without a guessed job ID or success state', async () => {
  const service = roomService()
  vi.mocked(service.finishSession).mockRejectedValue({ status: 409, message: 'Active job exists' })
  const clock = createInterviewClock(() => 0)
  clock.start('one')
  const { result } = renderHook(() => useSessionSubmission('session', service, clock))
  await act(async () => {
    await result.current.submit(eligible)
  })
  expect(result.current.submission).toBeNull()
  expect(result.current.canRetry).toBe(false)
  expect(result.current.error).toMatch(/xung đột/i)
  expect(result.current.timing).not.toBeNull()
  await act(async () => {
    await result.current.submit(eligible)
  })
  expect(service.finishSession).toHaveBeenCalledTimes(1)
})

test('network failure allows retry while keeping the frozen session', async () => {
  const service = roomService()
  vi.mocked(service.finishSession).mockRejectedValueOnce({
    status: 0,
    message: 'Network unavailable',
  })
  const clock = createInterviewClock(() => 0)
  clock.start('one')
  const { result } = renderHook(() => useSessionSubmission('session', service, clock))
  await act(async () => {
    await result.current.submit(eligible)
  })
  expect(result.current.canRetry).toBe(true)
  await act(async () => {
    await result.current.submit(eligible)
  })
  expect(result.current.submission?.jobId).toBe('job')
})
