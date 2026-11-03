import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { useSpeechTranscript } from './useSpeechTranscript'

import type {
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from '@/types/speech'

class FakeRecognition implements SpeechRecognitionLike {
  static instances: FakeRecognition[] = []
  static startError: Error | null = null

  lang = ''
  continuous = false
  interimResults = false
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn(() => {
    if (FakeRecognition.startError) throw FakeRecognition.startError
  })
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    FakeRecognition.instances.push(this)
  }

  emit(results: Array<{ text: string; isFinal: boolean }>, resultIndex = 0) {
    this.onresult?.({
      resultIndex,
      results: Object.assign(
        results.map(({ text, isFinal }) =>
          Object.assign([{ transcript: text, confidence: 1 }], { isFinal }),
        ),
        {},
      ),
    })
  }

  fail(error: string) {
    this.onerror?.({ error })
  }

  end() {
    this.onend?.()
  }
}

const speechWindow = window as unknown as Record<string, unknown>

function latest() {
  return FakeRecognition.instances[FakeRecognition.instances.length - 1]
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeRecognition.instances = []
  FakeRecognition.startError = null
  speechWindow.SpeechRecognition = FakeRecognition
})

afterEach(() => {
  vi.useRealTimers()
  delete speechWindow.SpeechRecognition
  delete speechWindow.webkitSpeechRecognition
})

describe('support detection', () => {
  test('reports unsupported without the API and start does nothing', () => {
    delete speechWindow.SpeechRecognition
    const { result } = renderHook(() => useSpeechTranscript())
    expect(result.current.status).toBe('unsupported')
    expect(result.current.isSupported).toBe(false)
    act(() => result.current.start())
    expect(result.current.status).toBe('unsupported')
    expect(result.current.error).toBeNull()
  })

  test('falls back to the webkit prefixed constructor', () => {
    delete speechWindow.SpeechRecognition
    speechWindow.webkitSpeechRecognition = FakeRecognition
    const { result } = renderHook(() => useSpeechTranscript())
    expect(result.current.status).toBe('idle')
    act(() => result.current.start())
    expect(FakeRecognition.instances).toHaveLength(1)
  })
})

describe('start and stop', () => {
  test('configures a continuous Vietnamese recognizer by default', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    expect(result.current.status).toBe('listening')
    expect(latest()).toMatchObject({ lang: 'vi-VN', continuous: true, interimResults: true })
  })

  test('accepts a language override', () => {
    const { result } = renderHook(() => useSpeechTranscript({ lang: 'en-US' }))
    act(() => result.current.start())
    expect(latest().lang).toBe('en-US')
  })

  test('ignores a second start while listening', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => result.current.start())
    expect(FakeRecognition.instances).toHaveLength(1)
  })

  test('stop keeps the transcript and still accepts the late final result', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => latest().emit([{ text: 'xin chào', isFinal: true }]))
    const recognition = latest()
    act(() => result.current.stop())
    expect(result.current.status).toBe('idle')
    expect(recognition.stop).toHaveBeenCalled()
    act(() =>
      recognition.emit(
        [
          { text: 'xin chào', isFinal: true },
          { text: 'các bạn', isFinal: true },
        ],
        1,
      ),
    )
    act(() => recognition.end())
    expect(result.current.finalTranscript).toBe('xin chào các bạn')
    expect(recognition.start).toHaveBeenCalledTimes(1)
  })

  test('starting again after stop replaces the previous recognizer', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    const first = latest()
    act(() => result.current.stop())
    act(() => result.current.start())
    expect(first.abort).toHaveBeenCalled()
    expect(FakeRecognition.instances).toHaveLength(2)
    act(() => first.emit([{ text: 'cũ', isFinal: true }]))
    expect(result.current.transcript).toBe('')
  })

  test('reset clears everything', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => latest().emit([{ text: 'một hai ba', isFinal: true }]))
    act(() => result.current.reset())
    expect(result.current).toMatchObject({
      status: 'idle',
      transcript: '',
      finalTranscript: '',
      wordCount: 0,
      currentWpm: null,
      averageWpm: null,
      truncated: false,
    })
  })
})

describe('transcript', () => {
  test('separates interim text from final text', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() =>
      latest().emit([
        { text: 'tôi là', isFinal: true },
        { text: 'lập trình', isFinal: false },
      ]),
    )
    expect(result.current.finalTranscript).toBe('tôi là')
    expect(result.current.interimTranscript).toBe('lập trình')
    expect(result.current.transcript).toBe('tôi là lập trình')
    expect(result.current.wordCount).toBe(4)
  })

  test('moves interim text into final text once confirmed', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => latest().emit([{ text: 'lập trình', isFinal: false }]))
    act(() => latest().emit([{ text: 'lập trình viên', isFinal: true }]))
    expect(result.current.finalTranscript).toBe('lập trình viên')
    expect(result.current.interimTranscript).toBe('')
  })

  test('keeps earlier finals when a later event starts at a higher index', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => latest().emit([{ text: 'một', isFinal: true }]))
    act(() =>
      latest().emit(
        [
          { text: 'một', isFinal: true },
          { text: 'hai', isFinal: true },
        ],
        1,
      ),
    )
    expect(result.current.finalTranscript).toBe('một hai')
  })

  test('truncates at the limit, stops listening and reports it', () => {
    const { result } = renderHook(() => useSpeechTranscript({ maxLength: 12 }))
    act(() => result.current.start())
    const recognition = latest()
    act(() => recognition.emit([{ text: 'aaa bbb cccc dddd', isFinal: true }]))
    expect(result.current.finalTranscript).toBe('aaa bbb cccc')
    expect(result.current.truncated).toBe(true)
    expect(result.current.status).toBe('idle')
    expect(recognition.stop).toHaveBeenCalled()
    act(() => result.current.start())
    expect(FakeRecognition.instances).toHaveLength(1)
    act(() => result.current.reset())
    act(() => result.current.start())
    expect(FakeRecognition.instances).toHaveLength(2)
  })
})

describe('speaking rate', () => {
  test('reports the pace over the sliding window once enough time has passed', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    act(() => latest().emit([{ text: Array(40).fill('từ').join(' '), isFinal: true }]))
    // 40 từ trong 10 giây (cửa sổ chưa đầy) = 240 từ/phút.
    expect(result.current.currentWpm).toBe(240)
    expect(result.current.pace).toBe('fast')
    expect(result.current.averageWpm).toBe(240)
  })

  test('shows no pace before the minimum listening time', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    act(() => latest().emit([{ text: 'một hai ba', isFinal: true }]))
    expect(result.current.currentWpm).toBeNull()
    expect(result.current.pace).toBeNull()
  })

  test('turns slow after a long silence', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    act(() => latest().emit([{ text: Array(20).fill('từ').join(' '), isFinal: true }]))
    expect(result.current.pace).toBe('good')
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(result.current.currentWpm).toBe(0)
    expect(result.current.pace).toBe('slow')
  })

  test('honours custom thresholds', () => {
    const { result } = renderHook(() => useSpeechTranscript({ fastWpm: 100 }))
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    act(() => latest().emit([{ text: Array(20).fill('từ').join(' '), isFinal: true }]))
    expect(result.current.currentWpm).toBe(120)
    expect(result.current.pace).toBe('fast')
  })

  test('the clock does not run while stopped', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    act(() => latest().emit([{ text: Array(20).fill('từ').join(' '), isFinal: true }]))
    act(() => result.current.stop())
    const frozen = result.current.averageWpm
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.averageWpm).toBe(frozen)
    expect(frozen).toBe(120)
  })
})

describe('auto restart', () => {
  test('restarts after Chrome ends the session while the user is still listening', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    const recognition = latest()
    act(() => {
      vi.advanceTimersByTime(8_000)
    })
    act(() => recognition.end())
    expect(recognition.start).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('listening')
  })

  test('does not restart after the user stops', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    const recognition = latest()
    act(() => result.current.stop())
    act(() => recognition.end())
    expect(recognition.start).toHaveBeenCalledTimes(1)
  })

  test('gives up when the session keeps ending immediately', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    const recognition = latest()
    for (let i = 0; i < 5; i += 1) act(() => recognition.end())
    expect(result.current.status).toBe('error')
    expect(result.current.error?.code).toBe('unstable')
  })

  test('slow ends do not count as failures', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    const recognition = latest()
    for (let i = 0; i < 6; i += 1) {
      act(() => {
        vi.advanceTimersByTime(8_000)
      })
      act(() => recognition.end())
    }
    expect(result.current.status).toBe('listening')
  })
})

describe('errors', () => {
  test.each([
    ['not-allowed', 'not-allowed'],
    ['service-not-allowed', 'not-allowed'],
    ['audio-capture', 'audio-capture'],
    ['network', 'network'],
    ['language-not-supported', 'unknown'],
  ] as const)('maps %s to %s and stops listening', (apiError, code) => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    const recognition = latest()
    act(() => recognition.fail(apiError))
    act(() => recognition.end())
    expect(result.current.status).toBe('error')
    expect(result.current.error?.code).toBe(code)
    expect(result.current.error?.message).toContain('nhập')
    expect(recognition.start).toHaveBeenCalledTimes(1)
  })

  test.each(['no-speech', 'aborted'])('treats %s as a harmless pause', (apiError) => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => latest().fail(apiError))
    expect(result.current.status).toBe('listening')
    expect(result.current.error).toBeNull()
  })

  test('keeps the transcript when an error happens', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => latest().emit([{ text: 'đã nói', isFinal: true }]))
    act(() => latest().fail('network'))
    expect(result.current.transcript).toBe('đã nói')
  })

  test('reports an error instead of throwing when start fails', () => {
    FakeRecognition.startError = new Error('InvalidStateError')
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    expect(result.current.status).toBe('error')
    expect(result.current.error?.code).toBe('unknown')
  })

  test('can be started again after an error', () => {
    const { result } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    act(() => latest().fail('network'))
    act(() => result.current.start())
    expect(result.current.status).toBe('listening')
    expect(result.current.error).toBeNull()
  })
})

describe('cleanup', () => {
  test('aborts and detaches the recognizer on unmount', () => {
    const { result, unmount } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    const recognition = latest()
    unmount()
    expect(recognition.abort).toHaveBeenCalled()
    expect(recognition.onresult).toBeNull()
    expect(recognition.onend).toBeNull()
  })

  test('stops the refresh timer on unmount', () => {
    const { result, unmount } = renderHook(() => useSpeechTranscript())
    act(() => result.current.start())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
