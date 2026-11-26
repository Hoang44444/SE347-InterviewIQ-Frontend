import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { endSession, refreshAccessToken } from './apiClient'
import { openScoringStream } from './scoringStreamService'

import { STORAGE_KEYS } from '@/constants'
import { SCORING_STREAM_BACKOFF_MS } from '@/constants/scoring'
import type { ScoringJobEvent, ScoringStreamConnectionState } from '@/types/scoring'
import { storage } from '@/utils/storage'

vi.mock('./apiClient', () => ({
  endSession: vi.fn(),
  refreshAccessToken: vi.fn(),
}))

function createStreamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

const sampleEvent: ScoringJobEvent = {
  userId: 'user-1',
  jobId: 'job-1',
  type: 'answer-scored',
  payload: {
    sessionId: 'session-1',
    overallScore: 8.5,
  },
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(endSession).mockReset()
  vi.mocked(refreshAccessToken).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('opens stream with bearer token, delivers job-update events, and ignores ping or invalid JSON', async () => {
  storage.set(STORAGE_KEYS.accessToken, 'access-token-1')
  const controller = new AbortController()
  const onEvent = vi.fn(() => controller.abort())
  const onOpen = vi.fn()

  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      createStreamResponse([
        'event: ping\ndata: {"timestamp":"2026-11-20T09:00:00.000Z"}\n\n',
        'event: job-update\ndata: {broken-json}\n\n',
        `event: job-update\ndata: ${JSON.stringify(sampleEvent)}\n\n`,
      ]),
    )
  vi.stubGlobal('fetch', fetchMock)

  await openScoringStream({ onEvent, onOpen, signal: controller.signal })

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/scoring\/stream$/),
    expect.objectContaining({
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: 'Bearer access-token-1',
      },
      signal: controller.signal,
    }),
  )
  expect(onOpen).toHaveBeenCalledTimes(1)
  expect(onOpen).toHaveBeenCalledWith(false)
  expect(onEvent).toHaveBeenCalledTimes(1)
  expect(onEvent).toHaveBeenCalledWith(sampleEvent)
})

test('on 401 refreshes token once and reconnects immediately with the new token', async () => {
  storage.set(STORAGE_KEYS.accessToken, 'expired-token')
  const controller = new AbortController()
  const onEvent = vi.fn(() => controller.abort())

  vi.mocked(refreshAccessToken).mockImplementation(async () => {
    storage.set(STORAGE_KEYS.accessToken, 'fresh-token')
    return 'fresh-token'
  })

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(
      createStreamResponse([`event: job-update\ndata: ${JSON.stringify(sampleEvent)}\n\n`]),
    )
  vi.stubGlobal('fetch', fetchMock)

  await openScoringStream({ onEvent, signal: controller.signal })

  expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    headers: {
      Accept: 'text/event-stream',
      Authorization: 'Bearer fresh-token',
    },
  })
  expect(onEvent).toHaveBeenCalledWith(sampleEvent)
})

test('stops without reconnecting when refreshAccessToken returns null after 401', async () => {
  const controller = new AbortController()
  const states: ScoringStreamConnectionState[] = []
  vi.mocked(refreshAccessToken).mockResolvedValue(null)

  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
  vi.stubGlobal('fetch', fetchMock)

  await openScoringStream({
    onEvent: vi.fn(),
    onStateChange: (state) => states.push(state),
    signal: controller.signal,
  })

  expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  expect(endSession).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(states.at(-1)).toBe('stopped')
})

test('on 401 reconnects immediately without refreshing if storage already has a newer token', async () => {
  storage.set(STORAGE_KEYS.accessToken, 'stale-token')
  const controller = new AbortController()
  const onEvent = vi.fn(() => controller.abort())

  const fetchMock = vi
    .fn()
    .mockImplementationOnce(async () => {
      storage.set(STORAGE_KEYS.accessToken, 'rotated-by-other-tab')
      return new Response(null, { status: 401 })
    })
    .mockResolvedValueOnce(
      createStreamResponse([`event: job-update\ndata: ${JSON.stringify(sampleEvent)}\n\n`]),
    )
  vi.stubGlobal('fetch', fetchMock)

  await openScoringStream({ onEvent, signal: controller.signal })

  expect(refreshAccessToken).not.toHaveBeenCalled()
  expect(endSession).not.toHaveBeenCalled()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    headers: {
      Accept: 'text/event-stream',
      Authorization: 'Bearer rotated-by-other-tab',
    },
  })
})

test('on 401 backs off and retries when refreshAccessToken fails due to network error', async () => {
  vi.useFakeTimers()
  storage.set(STORAGE_KEYS.accessToken, 'expired-token')
  const controller = new AbortController()
  const onEvent = vi.fn(() => controller.abort())

  vi.mocked(refreshAccessToken)
    .mockRejectedValueOnce(new Error('Network down'))
    .mockImplementationOnce(async () => {
      storage.set(STORAGE_KEYS.accessToken, 'recovered-token')
      return 'recovered-token'
    })

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(
      createStreamResponse([`event: job-update\ndata: ${JSON.stringify(sampleEvent)}\n\n`]),
    )
  vi.stubGlobal('fetch', fetchMock)

  const runPromise = openScoringStream({ onEvent, signal: controller.signal })

  await vi.advanceTimersByTimeAsync(0)
  expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  expect(endSession).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(SCORING_STREAM_BACKOFF_MS[0])
  await runPromise

  expect(refreshAccessToken).toHaveBeenCalledTimes(2)
  expect(endSession).not.toHaveBeenCalled()
  expect(onEvent).toHaveBeenCalledWith(sampleEvent)
})

test('calls onOpen(false) initially and onOpen(true) after unexpected stream closure and reconnect', async () => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const onOpen = vi.fn()
  const onEvent = vi.fn(() => controller.abort())

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(createStreamResponse([':ping\n\n']))
    .mockResolvedValueOnce(
      createStreamResponse([`event: job-update\ndata: ${JSON.stringify(sampleEvent)}\n\n`]),
    )
  vi.stubGlobal('fetch', fetchMock)

  const runPromise = openScoringStream({ onEvent, onOpen, signal: controller.signal })

  await vi.advanceTimersByTimeAsync(0)
  expect(onOpen).toHaveBeenNthCalledWith(1, false)

  await vi.advanceTimersByTimeAsync(SCORING_STREAM_BACKOFF_MS[0])
  await runPromise

  expect(onOpen).toHaveBeenNthCalledWith(2, true)
  expect(onEvent).toHaveBeenCalledWith(sampleEvent)
})

test('stops without reconnecting on 403 forbidden', async () => {
  const controller = new AbortController()
  const states: ScoringStreamConnectionState[] = []
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 403 }))
  vi.stubGlobal('fetch', fetchMock)

  await openScoringStream({
    onEvent: vi.fn(),
    onStateChange: (state) => states.push(state),
    signal: controller.signal,
  })

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(refreshAccessToken).not.toHaveBeenCalled()
  expect(endSession).not.toHaveBeenCalled()
  expect(states.at(-1)).toBe('stopped')
})

test('reconnects with exponential backoff on 5xx and cancels pending timer on abort', async () => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 500 }))
    .mockResolvedValueOnce(new Response(null, { status: 502 }))
  vi.stubGlobal('fetch', fetchMock)

  const runPromise = openScoringStream({ onEvent: vi.fn(), signal: controller.signal })

  await vi.advanceTimersByTimeAsync(0)
  expect(fetchMock).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(SCORING_STREAM_BACKOFF_MS[0] - 1)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(fetchMock).toHaveBeenCalledTimes(2)

  await vi.advanceTimersByTimeAsync(SCORING_STREAM_BACKOFF_MS[1] - 1)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(1)
  expect(fetchMock).toHaveBeenCalledTimes(3)

  controller.abort()
  await runPromise
  await vi.advanceTimersByTimeAsync(30_000)
  expect(fetchMock).toHaveBeenCalledTimes(3)
})
