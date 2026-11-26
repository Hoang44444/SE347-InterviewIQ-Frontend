import { vi } from 'vitest'

import type {
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from '@/types/speech'

/** Thay Web Speech API (jsdom không có): test tự phát kết quả, lỗi và sự kiện kết thúc. */
export class FakeRecognition implements SpeechRecognitionLike {
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
