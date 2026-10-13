import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { useAnswerSubmission } from './useAnswerSubmission'

import { answer, deferred, recording, signedParams } from '@/test/interviewFixtures'
import { roomService } from '@/test/roomService'
import type { Answer } from '@/types/interview'

test('keeps uploaded asset for a failed PUT and changed transcript, saves full response', async () => {
  const service = roomService()
  vi.mocked(service.submitAnswer).mockRejectedValueOnce({ status: 500, message: 'Save failed' })
  const { result } = renderHook(() => useAnswerSubmission('session', service))
  const file = recording()
  await act(async () => {
    await expect(result.current.save('one', ' first ', file)).rejects.toMatchObject({ status: 500 })
  })
  expect(result.current.savedAnswers).toEqual({})
  await act(async () => {
    await result.current.save('one', ' edited\n', file)
  })
  expect(service.getAnswerSignedParams).toHaveBeenCalledTimes(1)
  expect(service.uploadAnswerVideo).toHaveBeenCalledTimes(1)
  expect(service.submitAnswer).toHaveBeenLastCalledWith('session', 'one', {
    cloudinaryPublicId: signedParams.cloudinaryPublicId,
    transcript: ' edited\n',
  })
  expect(result.current.savedAnswers.one).toEqual({ ...answer, transcript: ' edited\n' })
})

test('a successful retake requires a new signed asset', async () => {
  const service = roomService()
  vi.mocked(service.submitAnswer).mockRejectedValueOnce({ status: 500, message: 'Save failed' })
  const { result } = renderHook(() => useAnswerSubmission('session', service))
  await act(async () => {
    await expect(result.current.save('one', '', recording())).rejects.toMatchObject({ status: 500 })
  })
  vi.mocked(service.getAnswerSignedParams).mockResolvedValue({
    ...signedParams,
    cloudinaryPublicId: 'new-asset',
  })
  vi.mocked(service.uploadAnswerVideo).mockResolvedValue('new-asset')
  await act(async () => {
    await result.current.save('one', '', recording())
  })
  expect(service.getAnswerSignedParams).toHaveBeenCalledTimes(2)
  expect(service.submitAnswer).toHaveBeenLastCalledWith('session', 'one', {
    cloudinaryPublicId: 'new-asset',
    transcript: '',
  })
})

test('upload errors require manual retry and never mark the question answered', async () => {
  const service = roomService()
  vi.mocked(service.uploadAnswerVideo).mockRejectedValueOnce(new Error('Upload failed'))
  const { result } = renderHook(() => useAnswerSubmission('session', service))
  const file = recording()
  await act(async () => {
    await expect(result.current.save('one', '', file)).rejects.toThrow('Upload failed')
  })
  expect(service.submitAnswer).not.toHaveBeenCalled()
  expect(service.uploadAnswerVideo).toHaveBeenCalledTimes(1)
  expect(result.current.savedAnswers).toEqual({})
  await act(async () => {
    await result.current.save('one', '', file)
  })
  expect(service.uploadAnswerVideo).toHaveBeenCalledTimes(2)
  expect(result.current.savedAnswers.one.transcript).toBe('')
})

test('rejects missing video and overlong transcript but accepts exactly 50000 characters', async () => {
  const service = roomService()
  const { result } = renderHook(() => useAnswerSubmission('session', service))
  await act(async () => {
    await expect(result.current.save('one', '', undefined)).rejects.toThrow()
  })
  await act(async () => {
    await expect(result.current.save('one', 'a'.repeat(50001), recording())).rejects.toThrow()
  })
  expect(service.getAnswerSignedParams).not.toHaveBeenCalled()
  await act(async () => {
    await result.current.save('one', 'a'.repeat(50000), recording())
  })
  expect(result.current.savedAnswers.one.transcript).toHaveLength(50000)
})

test('ignores duplicate actions and cannot overwrite an already saved answer', async () => {
  const service = roomService()
  const pending = deferred<Answer>()
  vi.mocked(service.submitAnswer).mockReturnValue(pending.promise)
  const { result } = renderHook(() => useAnswerSubmission('session', service))
  let save!: Promise<Answer | null>
  await act(async () => {
    save = result.current.save('one', '', recording())
    await Promise.resolve()
  })
  expect(result.current.phase).toBe('saving')
  await act(async () => {
    expect(await result.current.save('one', 'duplicate', recording())).toBeNull()
  })
  expect(result.current.savedAnswers).toEqual({})
  await act(async () => {
    pending.resolve(answer)
    await save
  })
  await act(async () => {
    expect(await result.current.save('one', 'edit', recording())).toBeNull()
  })
  expect(service.submitAnswer).toHaveBeenCalledTimes(1)
})

test.each([404, 409])('blocks further answer submissions on HTTP %s', async (status) => {
  const service = roomService()
  vi.mocked(service.getAnswerSignedParams).mockRejectedValueOnce({ status, message: 'Unavailable' })
  const { result } = renderHook(() => useAnswerSubmission('session', service))
  await act(async () => {
    await expect(result.current.save('one', '', recording())).rejects.toMatchObject({ status })
  })
  expect(result.current.blocked).toBe(true)
  await act(async () => {
    expect(await result.current.save('one', '', recording())).toBeNull()
  })
  expect(service.getAnswerSignedParams).toHaveBeenCalledTimes(1)
})

test('stops the upload/save pipeline when the room is unmounted during signing', async () => {
  const service = roomService()
  const signing = deferred<typeof signedParams>()
  vi.mocked(service.getAnswerSignedParams).mockReturnValue(signing.promise)
  const { result, unmount } = renderHook(() => useAnswerSubmission('session', service))
  let saving!: Promise<Answer | null>
  await act(async () => {
    saving = result.current.save('one', '', recording())
  })
  unmount()
  signing.resolve(signedParams)
  expect(await saving).toBeNull()
  expect(service.uploadAnswerVideo).not.toHaveBeenCalled()
  expect(service.submitAnswer).not.toHaveBeenCalled()
})
