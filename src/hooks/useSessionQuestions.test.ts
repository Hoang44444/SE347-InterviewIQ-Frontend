import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { describeGenerateError, useSessionQuestions } from './useSessionQuestions'

import { interviewService } from '@/services/interviewService'
import { deferred } from '@/test/interviewFixtures'
import { generatedQuestions } from '@/test/sessionFixtures'
import type { SessionQuestions } from '@/types/interview'

const id = generatedQuestions.sessionPublicId
const empty: SessionQuestions = { sessionPublicId: id, questions: [] }

afterEach(() => vi.restoreAllMocks())

test('maps each documented generate failure to a distinct message kind', () => {
  const kinds = [
    [{ status: 400, message: 'x' }, 'invalid'],
    [{ status: 404, message: 'x' }, 'not-found'],
    [{ status: 409, message: 'CV has not been parsed yet' }, 'cv-not-parsed'],
    [
      { status: 409, message: 'Questions can only be generated while the session is CREATED' },
      'not-created',
    ],
    [{ status: 500, message: 'Failed to generate interview questions' }, 'server'],
    [{ status: 0, message: 'timeout of 60000ms exceeded' }, 'timeout'],
    [{ status: 403, message: 'x' }, 'other'],
  ] as const
  for (const [error, kind] of kinds) expect(describeGenerateError(error).kind).toBe(kind)
})

test('loads questions sorted by orderIndex', async () => {
  const [first, second] = generatedQuestions.questions
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue({
    sessionPublicId: id,
    questions: [second, first],
  })
  const { result } = renderHook(() => useSessionQuestions(id))
  expect(result.current.isLoading).toBe(true)
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.questions.map((q) => q.orderIndex)).toEqual([1, 2])
})

test('reports a load failure and recovers on reload', async () => {
  const get = vi
    .spyOn(interviewService, 'getSessionQuestions')
    .mockRejectedValueOnce({ status: 500, message: 'Boom' })
    .mockResolvedValue(generatedQuestions)
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.loadError).toBe('Boom'))
  await act(async () => result.current.reload())
  expect(get).toHaveBeenCalledTimes(2)
  expect(result.current.loadError).toBe('')
  expect(result.current.questions).toHaveLength(2)
})

test('ref lock sends one generate request for duplicate calls in the same render', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(empty)
  const pending = deferred<SessionQuestions>()
  const generate = vi.spyOn(interviewService, 'generateQuestions').mockReturnValue(pending.promise)
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.isLoading).toBe(false))

  const stale = result.current.generate
  await act(async () => {
    void stale(5)
    void stale(5)
  })
  expect(generate).toHaveBeenCalledTimes(1)
  expect(generate).toHaveBeenCalledWith(id, 5)
  expect(result.current.isGenerating).toBe(true)

  await act(async () => pending.resolve(generatedQuestions))
  expect(result.current.isGenerating).toBe(false)
  expect(result.current.questions).toHaveLength(2)
})

test('keeps the previous set when regeneration fails and surfaces the error', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  vi.spyOn(interviewService, 'generateQuestions').mockRejectedValue({
    status: 500,
    message: 'Failed to generate interview questions',
  })
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.questions).toHaveLength(2))
  await act(async () => result.current.generate(5))
  expect(result.current.questions).toHaveLength(2)
  expect(result.current.generateError?.kind).toBe('server')
  expect(result.current.isGenerating).toBe(false)
})

test('does not show an error for 401 because the client redirects to login', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(empty)
  vi.spyOn(interviewService, 'generateQuestions').mockRejectedValue({
    status: 401,
    message: 'Unauthorized',
  })
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  await act(async () => result.current.generate())
  expect(result.current.generateError).toBeNull()
})

test('a generate result is not overwritten by a slower earlier load', async () => {
  const slowLoad = deferred<SessionQuestions>()
  vi.spyOn(interviewService, 'getSessionQuestions').mockReturnValue(slowLoad.promise)
  vi.spyOn(interviewService, 'generateQuestions').mockResolvedValue(generatedQuestions)
  const { result } = renderHook(() => useSessionQuestions(id))
  await act(async () => result.current.generate(5))
  await act(async () => slowLoad.resolve(empty))
  expect(result.current.questions).toHaveLength(2)
  expect(result.current.isLoading).toBe(false)
})
