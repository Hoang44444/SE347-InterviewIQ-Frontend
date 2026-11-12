import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { useIntegrityMonitor } from './useIntegrityMonitor'

import type { CheatLogService, CheatSummary } from '@/types/cheat'

vi.mock('@/services/faceDetector', () => ({
  createFaceDetector: () => Promise.reject(new Error('no wasm in tests')),
}))

class FakeTrack extends EventTarget {
  readyState = 'live'
}

function fakeStream(track = new FakeTrack()) {
  return { stream: { getVideoTracks: () => [track] } as unknown as MediaStream, track }
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  setVisibility('visible')
  vi.useRealTimers()
})

test('records leaving and returning to the tab with a duration and the current question', async () => {
  const { result } = renderHook(() =>
    useIntegrityMonitor({ enabled: true, stream: null, questionId: 'q1' }),
  )
  act(() => setVisibility('hidden'))
  expect(result.current.activeTypes).toEqual(['TAB_HIDDEN'])
  act(() => setVisibility('hidden')) // lặp lại không tạo thêm sự kiện
  expect(result.current.events).toHaveLength(1)
  act(() => setVisibility('visible'))
  expect(result.current.activeTypes).toEqual([])
  expect(result.current.events[0]).toMatchObject({
    type: 'TAB_HIDDEN',
    severity: 'MEDIUM',
    questionId: 'q1',
  })
  expect(result.current.events[0].endedAt).toBeDefined()
  expect(result.current.events[0].durationMs).toBeGreaterThanOrEqual(0)
})

test('records nothing while disabled', () => {
  const { result } = renderHook(() => useIntegrityMonitor({ enabled: false, stream: null }))
  act(() => setVisibility('hidden'))
  expect(result.current.events).toEqual([])
})

test('records fullscreen exit only after having been in fullscreen', () => {
  const { result } = renderHook(() => useIntegrityMonitor({ enabled: true, stream: null }))
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  expect(result.current.events).toEqual([])
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: document.body,
  })
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  expect(result.current.events.map((event) => event.type)).toEqual(['FULLSCREEN_EXIT'])
})

test('flags a window blur only after the grace period and not when the tab is hidden', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useIntegrityMonitor({ enabled: true, stream: null }))
  vi.spyOn(document, 'hasFocus').mockReturnValue(false)
  act(() => {
    window.dispatchEvent(new Event('blur'))
    vi.advanceTimersByTime(100)
  })
  expect(result.current.events).toEqual([])
  act(() => {
    vi.advanceTimersByTime(300)
  })
  expect(result.current.activeTypes).toEqual(['WINDOW_BLUR'])
  act(() => {
    window.dispatchEvent(new Event('focus'))
  })
  expect(result.current.activeTypes).toEqual([])

  act(() => {
    window.dispatchEvent(new Event('blur'))
    setVisibility('hidden')
    vi.advanceTimersByTime(500)
  })
  expect(result.current.events.map((event) => event.type)).toEqual(['WINDOW_BLUR', 'TAB_HIDDEN'])
})

test('flags camera loss, recovers on unmute, and degrades when the detector cannot load', async () => {
  const { stream, track } = fakeStream()
  const { result } = renderHook(() => useIntegrityMonitor({ enabled: true, stream }))
  expect(result.current.detectorState).toBe('loading')
  await act(async () => {})
  expect(result.current.detectorState).toBe('unavailable')
  act(() => {
    track.dispatchEvent(new Event('mute'))
  })
  expect(result.current.activeTypes).toEqual(['CAMERA_LOST'])
  expect(result.current.events[0].severity).toBe('HIGH')
  act(() => {
    track.dispatchEvent(new Event('unmute'))
  })
  expect(result.current.activeTypes).toEqual([])
})

const summaryOf = (totalCount: number): CheatSummary => ({
  totalCount,
  countsByType: { TAB_SWITCH: totalCount, WINDOW_BLUR: 0, FACE_MISSING: 0, MULTIPLE_FACES: 0 },
})

function fakeCheatLogs(overrides: Partial<CheatLogService> = {}): CheatLogService {
  return {
    record: vi.fn().mockResolvedValue({ log: {}, summary: summaryOf(1) }),
    list: vi.fn().mockResolvedValue({ logs: [], summary: summaryOf(0) }),
    ...overrides,
  }
}

test('sends a supported event once with its start time and keeps the returned counter', async () => {
  const cheatLogs = fakeCheatLogs()
  const { result } = renderHook(() =>
    useIntegrityMonitor({ enabled: true, stream: null, sessionId: 's1', cheatLogs }),
  )
  await act(async () => setVisibility('hidden'))
  await act(async () => setVisibility('hidden'))

  expect(cheatLogs.record).toHaveBeenCalledTimes(1)
  expect(cheatLogs.record).toHaveBeenCalledWith('s1', {
    eventType: 'TAB_SWITCH',
    occurredAt: result.current.events[0].startedAt,
    description: 'Rời tab phỏng vấn',
  })
  expect(result.current.summary?.totalCount).toBe(1)
})

test('does not send event types the backend does not know', async () => {
  const cheatLogs = fakeCheatLogs()
  renderHook(() => useIntegrityMonitor({ enabled: true, stream: null, sessionId: 's1', cheatLogs }))
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: {} })
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
  await act(async () => {
    document.dispatchEvent(new Event('fullscreenchange'))
  })

  expect(cheatLogs.record).not.toHaveBeenCalled()
})

test('restores the counter on mount and keeps the higher one when responses arrive out of order', async () => {
  const cheatLogs = fakeCheatLogs({
    list: vi.fn().mockResolvedValue({ logs: [], summary: summaryOf(3) }),
    record: vi.fn().mockResolvedValue({ log: {}, summary: summaryOf(2) }),
  })
  const { result } = renderHook(() =>
    useIntegrityMonitor({ enabled: true, stream: null, sessionId: 's1', cheatLogs }),
  )
  await vi.waitFor(() => expect(result.current.summary?.totalCount).toBe(3))

  await act(async () => setVisibility('hidden'))
  expect(result.current.summary?.totalCount).toBe(3)
})

test('a failing request never breaks monitoring', async () => {
  const cheatLogs = fakeCheatLogs({ record: vi.fn().mockRejectedValue({ status: 409 }) })
  const { result } = renderHook(() =>
    useIntegrityMonitor({ enabled: true, stream: null, sessionId: 's1', cheatLogs }),
  )
  await act(async () => setVisibility('hidden'))

  expect(result.current.events).toHaveLength(1)
  // Bộ đếm giữ nguyên giá trị đã nạp lúc vào phòng, không bị xoá khi ghi lỗi.
  expect(result.current.summary?.totalCount).toBe(0)
})

test('retries a transient failure after 2s with the same occurredAt and keeps the counter', async () => {
  vi.useFakeTimers()
  const record = vi
    .fn()
    .mockRejectedValueOnce({ status: 0 })
    .mockResolvedValue({ log: {}, summary: summaryOf(1) })
  const cheatLogs = fakeCheatLogs({ record })
  const { result } = renderHook(() =>
    useIntegrityMonitor({ enabled: true, stream: null, sessionId: 's1', cheatLogs }),
  )
  await act(async () => setVisibility('hidden'))
  expect(record).toHaveBeenCalledTimes(1)

  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })

  expect(record).toHaveBeenCalledTimes(2)
  expect(record.mock.calls[1][1].occurredAt).toBe(record.mock.calls[0][1].occurredAt)
  expect(result.current.summary?.totalCount).toBe(1)
})

test('does not retry a client error such as 409', async () => {
  vi.useFakeTimers()
  const record = vi.fn().mockRejectedValue({ status: 409 })
  const cheatLogs = fakeCheatLogs({ record })
  renderHook(() => useIntegrityMonitor({ enabled: true, stream: null, sessionId: 's1', cheatLogs }))
  await act(async () => setVisibility('hidden'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000)
  })

  expect(record).toHaveBeenCalledTimes(1)
})

test('gives up after five retries', async () => {
  vi.useFakeTimers()
  const record = vi.fn().mockRejectedValue({ status: 503 })
  const cheatLogs = fakeCheatLogs({ record })
  renderHook(() => useIntegrityMonitor({ enabled: true, stream: null, sessionId: 's1', cheatLogs }))
  await act(async () => setVisibility('hidden'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300_000)
  })

  expect(record).toHaveBeenCalledTimes(6)
})

test('keeps retrying after monitoring is disabled but stops on unmount', async () => {
  vi.useFakeTimers()
  const record = vi.fn().mockRejectedValue({ status: 0 })
  const cheatLogs = fakeCheatLogs({ record })
  const { rerender, unmount } = renderHook(
    ({ enabled }) => useIntegrityMonitor({ enabled, stream: null, sessionId: 's1', cheatLogs }),
    { initialProps: { enabled: true } },
  )
  await act(async () => setVisibility('hidden'))
  rerender({ enabled: false })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
  expect(record).toHaveBeenCalledTimes(2)

  unmount()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300_000)
  })
  expect(record).toHaveBeenCalledTimes(2)
})
