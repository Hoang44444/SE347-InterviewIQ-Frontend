export type SpeechStatus = 'unsupported' | 'idle' | 'listening' | 'error'

export type PaceStatus = 'slow' | 'good' | 'fast'

export type SpeechErrorCode = 'not-allowed' | 'audio-capture' | 'network' | 'unstable' | 'unknown'

export interface SpeechError {
  code: SpeechErrorCode
  message: string
}

/**
 * Kiểu tối thiểu của Web Speech API. Thư viện DOM của TypeScript chưa khai báo
 * SpeechRecognition nên hook dùng các kiểu này thay vì kiểu toàn cục.
 */
export interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}

export interface SpeechRecognitionResultLike {
  readonly length: number
  readonly isFinal: boolean
  readonly [index: number]: SpeechRecognitionAlternativeLike
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: {
    readonly length: number
    readonly [index: number]: SpeechRecognitionResultLike
  }
}

export interface SpeechRecognitionErrorEventLike {
  readonly error: string
}

export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike
