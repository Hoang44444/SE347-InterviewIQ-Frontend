import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, expect, test, vi } from 'vitest'

import { apiClient } from './apiClient'
import { interviewService } from './interviewService'

import { STORAGE_KEYS } from '@/constants'
import { answer, signedParams } from '@/test/interviewFixtures'
import { storage } from '@/utils/storage'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  localStorage.clear()
})

test('signs, PUTs only asset/transcript, submits and reads status through authenticated API', async () => {
  const requests: InternalAxiosRequestConfig[] = []
  const submission = { sessionPublicId: 'session', jobId: 'job', status: 'QUEUED' }
  const job = {
    jobId: 'job',
    sessionId: 'session',
    status: 'PROCESSING',
    createdAt: '2026-10-12T10:00:00.000Z',
    completedAt: null,
  }
  const responses = [signedParams, answer, submission, job]
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    return {
      data: { success: true, data: responses.shift() },
      status: config.url?.endsWith('submit') ? 202 : 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  storage.set(STORAGE_KEYS.accessToken, 'test-token')
  expect(await interviewService.getAnswerSignedParams('session', 'one')).toEqual(signedParams)
  expect(
    await interviewService.submitAnswer('session', 'one', {
      cloudinaryPublicId: signedParams.cloudinaryPublicId,
      transcript: '',
    }),
  ).toEqual(answer)
  expect(
    await interviewService.finishSession('session', {
      cvPublicId: 'cv',
      totalQuestions: 2,
      durationSeconds: 40,
    }),
  ).toEqual(submission)
  expect(await interviewService.getScoringJobStatus('job')).toEqual(job)
  expect(requests.map(({ method, url }) => [method, url])).toEqual([
    ['post', '/interview-session/session/questions/one/answer/signed-params'],
    ['put', '/interview-session/session/questions/one/answer'],
    ['post', '/interview-session/session/submit'],
    ['get', '/scoring/jobs/job/status'],
  ])
  expect(requests[0].data).toBeUndefined()
  expect(JSON.parse(requests[1].data)).toEqual({
    cloudinaryPublicId: signedParams.cloudinaryPublicId,
    transcript: '',
  })
  expect(JSON.parse(requests[2].data)).toEqual({
    cvPublicId: 'cv',
    totalQuestions: 2,
    durationSeconds: 40,
  })
  for (const request of requests) expect(request.headers.Authorization).toBe('Bearer test-token')
})

test('normalizes backend failures for answer conflict handling', async () => {
  apiClient.defaults.adapter = async (config) => {
    throw {
      response: { status: 409, data: { message: 'Session closed', code: 'SESSION_CLOSED' } },
      config,
    }
  }
  await expect(interviewService.getAnswerSignedParams('session', 'one')).rejects.toMatchObject({
    status: 409,
    message: 'Session closed',
  })
})

test('uploads video with all signed fields, matching file extension and no bearer/JSON headers', async () => {
  storage.set(STORAGE_KEYS.accessToken, 'must-not-reach-cloudinary')
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ public_id: signedParams.cloudinaryPublicId }),
  })
  vi.stubGlobal('fetch', fetcher)
  for (const [mimeType, filename] of [
    ['video/webm;codecs=vp9,opus', 'answer.webm'],
    ['video/mp4', 'answer.mp4'],
  ]) {
    const blob = new Blob(['video'], { type: mimeType })
    expect(
      await interviewService.uploadAnswerVideo(signedParams, {
        questionId: 'one',
        blob,
        mimeType,
        durationSeconds: 1,
        url: 'blob:test',
      }),
    ).toBe(signedParams.cloudinaryPublicId)
    const [url, options] = fetcher.mock.lastCall!
    expect(url).toBe(signedParams.uploadUrl)
    expect(options.method).toBe('POST')
    expect(options.headers).toBeUndefined()
    expect(options.credentials).toBe('omit')
    const form = options.body as FormData
    expect((form.get('file') as File).name).toBe(filename)
    expect(Object.fromEntries([...form.entries()].filter(([key]) => key !== 'file'))).toEqual({
      api_key: 'public-key',
      timestamp: '1791799200',
      signature: 'server-signature',
      public_id: signedParams.cloudinaryPublicId,
      allowed_formats: 'mp4,webm',
      overwrite: 'false',
    })
  }
})

test.each([
  new Blob([], { type: 'video/webm' }),
  new Blob(['video'], { type: 'audio/webm' }),
  new Blob(['video'], { type: 'video/quicktime' }),
  new Blob(['123456'], { type: 'video/webm' }),
])('rejects invalid/oversized video before network upload', async (blob) => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  await expect(
    interviewService.uploadAnswerVideo(
      { ...signedParams, maxFileSizeBytes: 5 },
      {
        questionId: 'one',
        blob,
        mimeType: blob.type,
        durationSeconds: 1,
        url: 'blob:test',
      },
    ),
  ).rejects.toThrow()
  expect(fetcher).not.toHaveBeenCalled()
})

test('accepts the exact size limit and rejects failed or mismatched provider responses', async () => {
  const blob = new Blob(['12345'], { type: 'video/webm' })
  const file = {
    questionId: 'one',
    blob,
    mimeType: blob.type,
    durationSeconds: 1,
    url: 'blob:test',
  }
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ public_id: signedParams.cloudinaryPublicId }),
    })
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ public_id: 'wrong' }) })
  vi.stubGlobal('fetch', fetcher)
  expect(
    await interviewService.uploadAnswerVideo({ ...signedParams, maxFileSizeBytes: 5 }, file),
  ).toBe(signedParams.cloudinaryPublicId)
  await expect(interviewService.uploadAnswerVideo(signedParams, file)).rejects.toThrow()
  await expect(interviewService.uploadAnswerVideo(signedParams, file)).rejects.toThrow()
})
