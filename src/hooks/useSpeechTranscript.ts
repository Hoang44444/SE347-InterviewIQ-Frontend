import { useCallback, useEffect, useRef, useState } from 'react'

import {
  SPEECH_LANG_DEFAULT,
  SPEECH_MAX_RAPID_RESTARTS,
  SPEECH_MIN_WINDOW_SECONDS,
  SPEECH_RESTART_GRACE_MS,
  SPEECH_TICK_MS,
  TRANSCRIPT_MAX_LENGTH,
} from '@/constants/speech'
import type {
  SpeechError,
  SpeechErrorCode,
  SpeechRecognitionConstructor,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
  SpeechStatus,
} from '@/types/speech'
import {
  appendFinalSegment,
  calculateWpm,
  countWords,
  getPaceStatus,
  windowedWpm,
} from '@/utils/speechRate'
import type { WordSnapshot } from '@/utils/speechRate'

export interface UseSpeechTranscriptOptions {
  lang?: string
  slowWpm?: number
  fastWpm?: number
  maxLength?: number
}

interface SpeechWindow {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const ERROR_MESSAGES: Record<SpeechErrorCode, string> = {
  'not-allowed':
    'Chưa được cấp quyền micro cho nhận dạng giọng nói. Bạn vẫn có thể ghi hình và nhập câu trả lời bằng tay.',
  'audio-capture':
    'Không tìm thấy micro để nhận dạng giọng nói. Bạn vẫn có thể ghi hình và nhập câu trả lời bằng tay.',
  network:
    'Dịch vụ nhận dạng giọng nói không kết nối được. Bạn vẫn có thể ghi hình và nhập câu trả lời bằng tay.',
  unstable:
    'Nhận dạng giọng nói liên tục bị gián đoạn nên đã dừng. Bạn vẫn có thể ghi hình và nhập câu trả lời bằng tay.',
  unknown: 'Nhận dạng giọng nói gặp sự cố. Bạn vẫn có thể ghi hình và nhập câu trả lời bằng tay.',
}

function speechError(code: SpeechErrorCode): SpeechError {
  return { code, message: ERROR_MESSAGES[code] }
}

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const speechWindow = window as unknown as SpeechWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

/** Mã lỗi của Web Speech API → mã của hook; null nếu chỉ là gián đoạn tạm thời. */
function fatalErrorCode(error: string): SpeechErrorCode | null {
  switch (error) {
    case 'no-speech':
    case 'aborted':
      return null
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed'
    case 'audio-capture':
      return 'audio-capture'
    case 'network':
      return 'network'
    default:
      return 'unknown'
  }
}

/**
 * Nhận dạng giọng nói theo thời gian thực bằng Web Speech API và tính tốc độ nói.
 * Hoàn toàn độc lập với useInterviewRecorder: không xin quyền camera/micro, và mọi
 * lỗi chỉ là thông báo, không chặn ghi hình hay nhập tay.
 */
export function useSpeechTranscript(options: UseSpeechTranscriptOptions = {}) {
  const {
    lang = SPEECH_LANG_DEFAULT,
    slowWpm,
    fastWpm,
    maxLength = TRANSCRIPT_MAX_LENGTH,
  } = options

  const [status, setStatus] = useState<SpeechStatus>(() =>
    getRecognitionConstructor() ? 'idle' : 'unsupported',
  )
  const [finalTranscript, setFinalTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [currentWpm, setCurrentWpm] = useState<number | null>(null)
  const [averageWpm, setAverageWpm] = useState<number | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<SpeechError | null>(null)

  const optionsRef = useRef({ lang, maxLength })
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const detachRef = useRef<(() => void) | null>(null)
  const wantListeningRef = useRef(false)
  const truncatedRef = useRef(false)
  const finalRef = useRef('')
  const interimRef = useRef('')
  const totalWordsRef = useRef(0)
  const snapshotsRef = useRef<WordSnapshot[]>([])
  // Đồng hồ chỉ chạy khi đang nghe: elapsedBefore + (now - runStart).
  const elapsedBeforeRef = useRef(0)
  const runStartRef = useRef<number | null>(null)
  const lastStartRef = useRef(0)
  const rapidRestartsRef = useRef(0)

  useEffect(() => {
    optionsRef.current = { lang, maxLength }
  }, [lang, maxLength])

  const elapsedSeconds = useCallback(() => {
    const running = runStartRef.current === null ? 0 : performance.now() - runStartRef.current
    return elapsedBeforeRef.current + running / 1000
  }, [])

  const refreshRates = useCallback(() => {
    const now = elapsedSeconds()
    const total = totalWordsRef.current
    setCurrentWpm(windowedWpm(snapshotsRef.current, now, total))
    setAverageWpm(now >= SPEECH_MIN_WINDOW_SECONDS ? calculateWpm(total, now) : null)
  }, [elapsedSeconds])

  const pauseClock = useCallback(() => {
    if (runStartRef.current === null) return
    elapsedBeforeRef.current += (performance.now() - runStartRef.current) / 1000
    runStartRef.current = null
  }, [])

  const detach = useCallback(() => {
    detachRef.current?.()
    detachRef.current = null
    recognitionRef.current = null
  }, [])

  const fail = useCallback(
    (code: SpeechErrorCode) => {
      wantListeningRef.current = false
      pauseClock()
      setError(speechError(code))
      setStatus('error')
      refreshRates()
    },
    [pauseClock, refreshRates],
  )

  const handleResult = useCallback(
    (event: SpeechRecognitionEventLike) => {
      rapidRestartsRef.current = 0
      let interim = ''
      let final = finalRef.current
      let didTruncate = false
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) {
          const appended = appendFinalSegment(final, text, optionsRef.current.maxLength)
          final = appended.text
          if (appended.truncated) {
            didTruncate = true
            break
          }
        } else {
          interim += text
        }
      }

      finalRef.current = final
      interimRef.current = didTruncate ? '' : interim.trim()
      setFinalTranscript(final)
      setInterimTranscript(interimRef.current)

      const total = countWords(final) + countWords(interimRef.current)
      totalWordsRef.current = total
      setWordCount(total)
      snapshotsRef.current.push({ at: elapsedSeconds(), totalWords: total })

      if (didTruncate) {
        truncatedRef.current = true
        setTruncated(true)
        wantListeningRef.current = false
        pauseClock()
        recognitionRef.current?.stop()
        setStatus('idle')
      }
      refreshRates()
    },
    [elapsedSeconds, pauseClock, refreshRates],
  )

  const launch = useCallback(() => {
    const Recognition = getRecognitionConstructor()
    if (!Recognition) return false

    const recognition = new Recognition()
    recognition.lang = optionsRef.current.lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      if (recognitionRef.current === recognition) handleResult(event)
    }
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return
      const code = fatalErrorCode(event.error)
      if (code) fail(code)
    }
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      if (!wantListeningRef.current) {
        detach()
        return
      }
      // Chrome tự dừng sau một quãng im lặng: khởi động lại, trừ khi liên tục thất bại ngay.
      const lived = performance.now() - lastStartRef.current
      rapidRestartsRef.current = lived < SPEECH_RESTART_GRACE_MS ? rapidRestartsRef.current + 1 : 0
      if (rapidRestartsRef.current > SPEECH_MAX_RAPID_RESTARTS) {
        detach()
        fail('unstable')
        return
      }
      try {
        lastStartRef.current = performance.now()
        recognition.start()
      } catch {
        detach()
        fail('unknown')
      }
    }

    recognitionRef.current = recognition
    detachRef.current = () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
    }
    lastStartRef.current = performance.now()
    try {
      recognition.start()
    } catch {
      detach()
      return false
    }
    return true
  }, [detach, fail, handleResult])

  const start = useCallback(() => {
    if (wantListeningRef.current || truncatedRef.current) return
    if (!getRecognitionConstructor()) return
    // Bản trước có thể chưa kịp kết thúc sau stop(): bỏ nó đi thay vì để hai phiên song song.
    recognitionRef.current?.abort()
    detach()

    rapidRestartsRef.current = 0
    wantListeningRef.current = true
    setError(null)
    if (!launch()) {
      fail('unknown')
      return
    }
    runStartRef.current = performance.now()
    setStatus('listening')
  }, [detach, fail, launch])

  const stop = useCallback(() => {
    if (!wantListeningRef.current) return
    wantListeningRef.current = false
    pauseClock()
    // stop() (không phải abort) để kết quả chốt cuối cùng vẫn được trả về.
    recognitionRef.current?.stop()
    setStatus('idle')
    refreshRates()
  }, [pauseClock, refreshRates])

  const reset = useCallback(() => {
    wantListeningRef.current = false
    recognitionRef.current?.abort()
    detach()
    runStartRef.current = null
    elapsedBeforeRef.current = 0
    finalRef.current = ''
    interimRef.current = ''
    totalWordsRef.current = 0
    snapshotsRef.current = []
    truncatedRef.current = false
    rapidRestartsRef.current = 0
    setFinalTranscript('')
    setInterimTranscript('')
    setWordCount(0)
    setCurrentWpm(null)
    setAverageWpm(null)
    setTruncated(false)
    setError(null)
    setStatus(getRecognitionConstructor() ? 'idle' : 'unsupported')
  }, [detach])

  useEffect(() => {
    if (status !== 'listening') return
    const timer = setInterval(refreshRates, SPEECH_TICK_MS)
    return () => clearInterval(timer)
  }, [status, refreshRates])

  useEffect(
    () => () => {
      wantListeningRef.current = false
      const recognition = recognitionRef.current
      detach()
      try {
        recognition?.abort()
      } catch {
        /* Phiên có thể đã kết thúc. */
      }
    },
    [detach],
  )

  const transcript = interimTranscript
    ? appendFinalSegment(finalTranscript, interimTranscript, maxLength).text
    : finalTranscript

  return {
    status,
    isSupported: status !== 'unsupported',
    transcript,
    finalTranscript,
    interimTranscript,
    wordCount,
    currentWpm,
    averageWpm,
    pace: getPaceStatus(currentWpm, { slow: slowWpm, fast: fastWpm }),
    truncated,
    error,
    start,
    stop,
    reset,
  }
}
