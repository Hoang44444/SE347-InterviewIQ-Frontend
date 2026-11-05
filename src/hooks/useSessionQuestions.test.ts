import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { toGenerateError, useSessionQuestions } from './useSessionQuestions'

import { interviewService } from '@/services/interviewService'
import { deferred } from '@/test/interviewFixtures'
import type { ApiError } from '@/types/api'
import type { SessionQuestions } from '@/types/interview'

const ID = '11111111-1111-4111-8111-111111111111'
const result: SessionQuestions = {
  sessionPublicId: ID,
  questions: [
    { publicId: 'q1', orderIndex: 0, content: 'A', domain: 'TECHNICAL', difficulty: 'EASY' },
    { publicId: 'q2', orderIndex: 1, content: 'B', domain: 'BEHAVIORAL', difficulty: 'HARD' },
  ],
}
const empty: SessionQuestions = { sessionPublicId: ID, questions: [] }
const apiError = (status: number, message = 'x', extra: Partial<ApiError> = {}) =>
  ({ status, message, ...extra }) as ApiError

afterEach(() => vi.restoreAllMocks())

function setup(reload = vi.fn().mockResolvedValue(undefined)) {
  const onGenerated = vi.fn()
  const hook = renderHook(() => useSessionQuestions({ sessionPublicId: ID, reload, onGenerated }))
  return { ...hook, reload, onGenerated }
}

test('loads existing questions on mount', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(result)
  const { result: hook } = setup()
  expect(hook.current.isLoading).toBe(true)
  await waitFor(() => expect(hook.current.isLoading).toBe(false))
  expect(hook.current.questions).toEqual(result.questions)
})

test('generate replaces the list, reports the total and ignores a second call while pending', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(empty)
  const pending = deferred<SessionQuestions>()
  const post = vi
    .spyOn(interviewService, 'generateSessionQuestions')
    .mockReturnValue(pending.promise)
  const { result: hook, onGenerated } = setup()
  await waitFor(() => expect(hook.current.isLoading).toBe(false))
  await act(async () => {
    void hook.current.generate(4)
    void hook.current.generate(4)
  })
  expect(post).toHaveBeenCalledTimes(1)
  expect(post).toHaveBeenCalledWith(ID, { count: 4 })
  expect(hook.current.isGenerating).toBe(true)
  await act(async () => pending.resolve(result))
  expect(hook.current.questions).toEqual(result.questions)
  expect(hook.current.isGenerating).toBe(false)
  expect(onGenerated).toHaveBeenCalledWith(2)
})

test('409 CV not parsed is retryable, 409 other re-syncs the session', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(empty)
  const post = vi
    .spyOn(interviewService, 'generateSessionQuestions')
    .mockRejectedValueOnce(apiError(409, 'CV has not been parsed yet'))
    .mockRejectedValueOnce(apiError(409, 'Session is not in CREATED state'))
  const { result: hook, reload } = setup()
  await waitFor(() => expect(hook.current.isLoading).toBe(false))
  await act(async () => hook.current.generate())
  expect(hook.current.generateError?.kind).toBe('cv-not-parsed')
  expect(reload).not.toHaveBeenCalled()
  await act(async () => hook.current.generate())
  expect(hook.current.generateError?.kind).toBe('not-created')
  expect(reload).toHaveBeenCalledTimes(1)
  expect(post).toHaveBeenCalledTimes(2)
})

test('maps other statuses and stays silent on 401', () => {
  expect(toGenerateError(apiError(401))).toBeNull()
  expect(toGenerateError(apiError(400, 'x', { errors: { count: ['bad'] } }))?.kind).toBe('invalid')
  expect(toGenerateError(apiError(403))?.kind).toBe('forbidden')
  expect(toGenerateError(apiError(404))?.kind).toBe('not-found')
  expect(toGenerateError(apiError(500))?.kind).toBe('failed')
  expect(toGenerateError(apiError(0))?.kind).toBe('failed')
})
