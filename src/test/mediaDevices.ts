import { vi } from 'vitest'

/** Doubles only browser device boundaries; the recorder hook and room remain real. */
export function mockMediaDevices() {
  class FakeRecorder extends EventTarget {
    static instances: FakeRecorder[] = []
    static isTypeSupported() {
      return true
    }
    state: RecordingState = 'inactive'
    mimeType = 'video/webm;codecs=vp9,opus'
    constructor() {
      super()
      FakeRecorder.instances.push(this)
    }
    start() {
      this.state = 'recording'
    }
    stop() {
      this.state = 'inactive'
      queueMicrotask(() => {
        const event = new Event('dataavailable')
        Object.defineProperty(event, 'data', {
          value: new Blob(['video'], { type: this.mimeType }),
        })
        this.dispatchEvent(event)
        this.dispatchEvent(new Event('stop'))
      })
    }
  }
  const tracks = ['audio', 'video'].map((kind) =>
    Object.assign(new EventTarget(), {
      kind,
      readyState: 'live',
      enabled: true,
      muted: false,
      label: kind,
      stop: vi.fn(),
    }),
  )
  const stream = {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((track) => track.kind === 'audio'),
    getVideoTracks: () => tracks.filter((track) => track.kind === 'video'),
  }
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => `blob:${crypto.randomUUID()}`),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  return { tracks, getUserMedia, FakeRecorder }
}
