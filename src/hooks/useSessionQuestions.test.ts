import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import {
  describeGenerateError,
  describeRegenerateError,
  useSessionQuestions,
} from './useSessionQuestions'

import { interviewService } from '@/services/interviewService'
import { questionBankService } from '@/services/questionBankService'
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
    void stale({ count: 5 })
    void stale({ count: 5 })
  })
  expect(generate).toHaveBeenCalledTimes(1)
  expect(generate).toHaveBeenCalledWith(id, { count: 5 })
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
  await act(async () => result.current.generate({ count: 5 }))
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
  await act(async () => result.current.generate({ count: 5 }))
  await act(async () => slowLoad.resolve(empty))
  expect(result.current.questions).toHaveLength(2)
  expect(result.current.isLoading).toBe(false)
})

test('generate passes domain and difficulty through', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(empty)
  const generate = vi
    .spyOn(interviewService, 'generateQuestions')
    .mockResolvedValue(generatedQuestions)
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  await act(async () => result.current.generate({ count: 4, domain: 'TECHNICAL' }))
  expect(generate).toHaveBeenCalledWith(id, { count: 4, domain: 'TECHNICAL' })
})

test('maps each documented regenerate failure to its own message kind', () => {
  const kinds = [
    [{ status: 400, message: 'x' }, 'invalid'],
    [{ status: 404, message: 'Interview question not found or unavailable' }, 'not-found'],
    [{ status: 409, message: 'CV has not been parsed yet' }, 'cv-not-parsed'],
    [{ status: 409, message: 'session is not CREATED' }, 'not-created'],
    [{ status: 500, message: 'Failed' }, 'server'],
    [{ status: 0, message: 'timeout' }, 'timeout'],
    [{ status: 403, message: 'x' }, 'other'],
  ] as const
  for (const [error, kind] of kinds) expect(describeRegenerateError(error).kind).toBe(kind)
  expect(describeRegenerateError({ status: 500, message: 'x' }).message).toMatch(/Câu cũ được giữ/)
})

test('regenerate replaces the set in place and reports which question is running', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  const [first, second] = generatedQuestions.questions
  const pending = deferred<SessionQuestions>()
  const regenerate = vi
    .spyOn(interviewService, 'regenerateQuestion')
    .mockReturnValue(pending.promise)
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.questions).toHaveLength(2))

  act(() => void result.current.regenerate(first.publicId, { difficulty: 'HARD' }))
  expect(result.current.regeneratingId).toBe(first.publicId)
  expect(result.current.isBusy).toBe(true)
  expect(regenerate).toHaveBeenCalledWith(id, first.publicId, { difficulty: 'HARD' })

  const rewritten = { ...first, content: 'Câu mới', difficulty: 'HARD' as const }
  await act(async () => pending.resolve({ sessionPublicId: id, questions: [second, rewritten] }))
  expect(result.current.regeneratingId).toBeNull()
  expect(result.current.isBusy).toBe(false)
  // sắp theo orderIndex nên câu được viết lại vẫn đứng đúng chỗ
  expect(result.current.questions.map((q) => q.content)).toEqual(['Câu mới', second.content])
})

test('a regenerate failure keeps the old question and names the question that failed', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  vi.spyOn(interviewService, 'regenerateQuestion').mockRejectedValueOnce({
    status: 500,
    message: 'Failed',
  })
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.questions).toHaveLength(2))
  const target = generatedQuestions.questions[1].publicId

  await act(async () => result.current.regenerate(target))
  expect(result.current.questions).toEqual(generatedQuestions.questions)
  expect(result.current.regenerateFailure).toEqual({
    questionPublicId: target,
    error: expect.objectContaining({ kind: 'server' }),
  })
  expect(result.current.generateError).toBeNull()

  // thao tác kế tiếp xoá lỗi cũ
  vi.spyOn(interviewService, 'regenerateQuestion').mockResolvedValue(generatedQuestions)
  await act(async () => result.current.regenerate(target))
  expect(result.current.regenerateFailure).toBeNull()
})

test('regenerate sends one request for double calls and ignores 401', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  const pending = deferred<SessionQuestions>()
  const regenerate = vi
    .spyOn(interviewService, 'regenerateQuestion')
    .mockReturnValue(pending.promise)
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.questions).toHaveLength(2))
  const [a, b] = generatedQuestions.questions

  const stale = result.current.regenerate
  await act(async () => {
    void stale(a.publicId)
    void stale(a.publicId)
    void stale(b.publicId)
  })
  expect(regenerate).toHaveBeenCalledTimes(1)
  await act(async () => pending.reject({ status: 401, message: 'Unauthorized' }))
  expect(result.current.regenerateFailure).toBeNull()
})

test('one write at a time: generate blocks regenerate, save and from-bank', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  const pending = deferred<SessionQuestions>()
  vi.spyOn(interviewService, 'generateQuestions').mockReturnValue(pending.promise)
  const regenerate = vi.spyOn(interviewService, 'regenerateQuestion')
  const save = vi.spyOn(questionBankService, 'saveFromSession')
  const fromBank = vi.spyOn(questionBankService, 'useInSession')
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.questions).toHaveLength(2))

  let saved: unknown = 'unset'
  let replaced: unknown = 'unset'
  await act(async () => {
    void result.current.generate()
    void result.current.regenerate(generatedQuestions.questions[0].publicId)
    saved = await result.current.saveToBank()
    replaced = await result.current.replaceFromBank(['a', 'b', 'c'])
  })
  expect(regenerate).not.toHaveBeenCalled()
  expect(save).not.toHaveBeenCalled()
  expect(fromBank).not.toHaveBeenCalled()
  expect(saved).toBeUndefined()
  expect(replaced).toBeUndefined()
  await act(async () => pending.resolve(generatedQuestions))
})

test('saveToBank saves the whole set or chosen ids and returns the counts', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  const save = vi
    .spyOn(questionBankService, 'saveFromSession')
    .mockResolvedValue({ savedCount: 1, skippedCount: 1 })
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.questions).toHaveLength(2))

  let whole: unknown
  let one: unknown
  await act(async () => {
    whole = await result.current.saveToBank()
  })
  await act(async () => {
    one = await result.current.saveToBank(['q1'])
  })
  expect(whole).toEqual({ ok: true, result: { savedCount: 1, skippedCount: 1 } })
  expect(one).toEqual(whole)
  expect(save).toHaveBeenNthCalledWith(1, { sessionPublicId: id })
  expect(save).toHaveBeenNthCalledWith(2, { sessionPublicId: id, questionPublicIds: ['q1'] })
  expect(result.current.isSaving).toBe(false)
  expect(result.current.questions).toHaveLength(2)
})

test('saveToBank maps 409 to the bank-full message and keeps the questions', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  vi.spyOn(questionBankService, 'saveFromSession').mockRejectedValue({
    status: 409,
    message: 'Question bank is full',
  })
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.questions).toHaveLength(2))
  let outcome: unknown
  await act(async () => {
    outcome = await result.current.saveToBank()
  })
  expect(outcome).toMatchObject({ ok: false, error: { kind: 'bank-full' } })
  expect(result.current.questions).toHaveLength(2)
})

test('replaceFromBank swaps the whole set in the order given; a 409 keeps the set', async () => {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  const fromBank = vi
    .spyOn(questionBankService, 'useInSession')
    .mockResolvedValueOnce({
      sessionPublicId: id,
      questions: [
        { publicId: 'n1', orderIndex: 1, content: 'Một', domain: 'TECHNICAL', difficulty: 'HARD' },
        { publicId: 'n2', orderIndex: 2, content: 'Hai', domain: 'BEHAVIORAL', difficulty: 'EASY' },
        { publicId: 'n3', orderIndex: 3, content: 'Ba', domain: 'SITUATIONAL', difficulty: 'EASY' },
      ],
    })
    .mockRejectedValueOnce({ status: 409, message: 'not CREATED' })
  const { result } = renderHook(() => useSessionQuestions(id))
  await waitFor(() => expect(result.current.questions).toHaveLength(2))

  let first: unknown
  await act(async () => {
    first = await result.current.replaceFromBank(['x', 'y', 'z'])
  })
  expect(fromBank).toHaveBeenCalledWith(id, ['x', 'y', 'z'])
  expect(first).toEqual({ ok: true })
  expect(result.current.questions.map((q) => q.content)).toEqual(['Một', 'Hai', 'Ba'])
  expect(result.current.isReplacing).toBe(false)

  let second: unknown
  await act(async () => {
    second = await result.current.replaceFromBank(['x', 'y', 'z'])
  })
  expect(second).toMatchObject({ ok: false, error: { kind: 'not-created' } })
  expect(result.current.questions.map((q) => q.content)).toEqual(['Một', 'Hai', 'Ba'])
})
