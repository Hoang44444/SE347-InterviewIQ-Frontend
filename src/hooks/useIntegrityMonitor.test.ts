import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { useIntegrityMonitor } from './useIntegrityMonitor'

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
