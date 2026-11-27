import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'

import { useScoringStream } from './useScoringStream'

import { openScoringStream } from '@/services/scoringStreamService'
import type { OpenScoringStreamOptions } from '@/services/scoringStreamService'
import type { ScoringJobEvent } from '@/types/scoring'

vi.mock('@/services/scoringStreamService', () => ({
  openScoringStream: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(openScoringStream).mockReset()
})

test('does not open stream when enabled is false or sessionId is null', () => {
  const { result, rerender } = renderHook(
    ({ enabled, sessionId }: { enabled: boolean; sessionId: string | null }) =>
      useScoringStream({ enabled, sessionId }),
    { initialProps: { enabled: false, sessionId: 'session-1' as string | null } },
  )

  expect(result.current.connectionState).toBe('idle')
  expect(openScoringStream).not.toHaveBeenCalled()

  rerender({ enabled: true, sessionId: null })
  expect(result.current.connectionState).toBe('idle')
  expect(openScoringStream).not.toHaveBeenCalled()
})

test('filters events by sessionId, invokes callbacks, and does not reopen when callbacks change', () => {
  let capturedOptions: OpenScoringStreamOptions | undefined
  vi.mocked(openScoringStream).mockImplementation((options) => {
    capturedOptions = options
    return new Promise(() => {})
  })

  const onScored = vi.fn()
  const onFailed = vi.fn()
  const onConnected = vi.fn()
  const onReconnected = vi.fn()

  const { result, rerender } = renderHook(
    ({ scoredCb }) =>
      useScoringStream({
        enabled: true,
        sessionId: 'session-1',
        onScored: scoredCb,
        onFailed,
        onConnected,
        onReconnected,
      }),
    { initialProps: { scoredCb: onScored } },
  )

  expect(openScoringStream).toHaveBeenCalledTimes(1)
  expect(capturedOptions).toBeDefined()

  act(() => {
    capturedOptions?.onStateChange?.('open')
    capturedOptions?.onOpen?.(false)
  })
  expect(result.current.connectionState).toBe('open')
  expect(onConnected).toHaveBeenCalledTimes(1)
  expect(onReconnected).not.toHaveBeenCalled()

  act(() => {
    capturedOptions?.onOpen?.(true)
  })
  expect(onConnected).toHaveBeenCalledTimes(2)
  expect(onReconnected).toHaveBeenCalledTimes(1)

  const otherSessionEvent: ScoringJobEvent = {
    userId: 'user-1',
    jobId: 'job-other',
    type: 'answer-scored',
    payload: { sessionId: 'session-other', overallScore: 9 },
  }
  const matchingScoredEvent: ScoringJobEvent = {
    userId: 'user-1',
    jobId: 'job-1',
    type: 'answer-scored',
    payload: { sessionId: 'session-1', overallScore: 8.4 },
  }
  const matchingFailedEvent: ScoringJobEvent = {
    userId: 'user-1',
    jobId: 'job-2',
    type: 'answer-failed',
    payload: { sessionId: 'session-1', error: 'AI timeout' },
  }

  const nextScored = vi.fn()
  rerender({ scoredCb: nextScored })
  expect(openScoringStream).toHaveBeenCalledTimes(1)

  act(() => {
    capturedOptions?.onEvent(otherSessionEvent)
    capturedOptions?.onEvent(matchingScoredEvent)
    capturedOptions?.onEvent(matchingFailedEvent)
  })

  expect(onScored).not.toHaveBeenCalled()
  expect(nextScored).toHaveBeenCalledTimes(1)
  expect(nextScored).toHaveBeenCalledWith(matchingScoredEvent)
  expect(onFailed).toHaveBeenCalledTimes(1)
  expect(onFailed).toHaveBeenCalledWith('AI timeout', matchingFailedEvent)
})

test('aborts stream cleanly on unmount and resets to idle when disabled', () => {
  let capturedSignal: AbortSignal | undefined
  vi.mocked(openScoringStream).mockImplementation((options) => {
    capturedSignal = options.signal
    return new Promise(() => {})
  })

  const { result, rerender, unmount } = renderHook(
    ({ enabled }: { enabled: boolean }) => useScoringStream({ enabled, sessionId: 'session-1' }),
    { initialProps: { enabled: true } },
  )

  expect(capturedSignal?.aborted).toBe(false)

  rerender({ enabled: false })
  expect(capturedSignal?.aborted).toBe(true)
  expect(result.current.connectionState).toBe('idle')

  rerender({ enabled: true })
  expect(capturedSignal?.aborted).toBe(false)

  unmount()
  expect(capturedSignal?.aborted).toBe(true)
})
