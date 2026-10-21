import { useCallback, useEffect, useRef, useState } from 'react'

import type { InterviewRecording, InterviewRecorderStatus } from '@/types/recording'

const MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

interface RecordingSession {
  recorder: MediaRecorder
  done: Promise<InterviewRecording | null>
  resolve: (recording: InterviewRecording | null) => void
  detach: () => void
  failed: boolean
  stoppedAt: number | null
}

function permissionError(error: unknown): string {
  const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Chưa được cấp quyền camera hoặc micro. Mở cài đặt quyền của trang trên thanh địa chỉ, cho phép cả hai thiết bị rồi bấm Thử lại. Video là bắt buộc để nộp câu trả lời.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Không tìm thấy đủ camera và micro. Kết nối cả hai thiết bị rồi thử lại.'
    case 'NotReadableError':
    case 'AbortError':
      return 'Không truy cập được camera hoặc micro. Kiểm tra kết nối và đóng ứng dụng khác đang dùng thiết bị rồi thử lại.'
    default:
      return 'Không bật được camera và micro. Kiểm tra thiết bị và quyền của trang rồi thử lại.'
  }
}

export function useInterviewRecorder() {
  const [status, setStatus] = useState<InterviewRecorderStatus>('idle')
  const [error, setError] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recordings, setRecordings] = useState<Record<string, InterviewRecording>>({})
  const mountedRef = useRef(false)
  const statusRef = useRef<InterviewRecorderStatus>('idle')
  const requestRef = useRef(0)
  const devicesStoppingRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const detachTracksRef = useRef<(() => void) | null>(null)
  const sessionRef = useRef<RecordingSession | null>(null)
  const recordingsRef = useRef<Record<string, InterviewRecording>>({})

  const updateStatus = useCallback((next: InterviewRecorderStatus) => {
    statusRef.current = next
    if (mountedRef.current) setStatus(next)
  }, [])

  const releaseStream = useCallback(() => {
    detachTracksRef.current?.()
    detachTracksRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (mountedRef.current) setStream(null)
  }, [])

  const reportError = useCallback(
    (message: string) => {
      if (mountedRef.current) setError(message)
      updateStatus('error')
    },
    [updateStatus],
  )

  /** Các thao tác cùng chờ chunk cuối và sự kiện stop của phiên đang ghi. */
  const stopRecording = useCallback((): Promise<InterviewRecording | null> => {
    const session = sessionRef.current
    if (!session) return Promise.resolve(null)
    if (session.recorder.state !== 'inactive') {
      session.stoppedAt ??= performance.now()
      if (!session.failed) updateStatus('stopping')
      try {
        session.recorder.stop()
      } catch {
        session.failed = true
        session.detach()
        sessionRef.current = null
        releaseStream()
        reportError('Không chốt được bản ghi. Bản ghi trước vẫn được giữ; hãy thử lại.')
        session.resolve(null)
      }
    }
    return session.done
  }, [releaseStream, reportError, updateStatus])

  const disableDevices = useCallback(async () => {
    // getUserMedia không có abort: token vô hiệu hoá cả yêu cầu đang bỏ ngỏ.
    requestRef.current += 1
    devicesStoppingRef.current = true
    await stopRecording()
    releaseStream()
    devicesStoppingRef.current = false
    if (mountedRef.current) setError('')
    updateStatus('idle')
  }, [releaseStream, stopRecording, updateStatus])

  const enableDevices = useCallback(async () => {
    if (
      !mountedRef.current ||
      devicesStoppingRef.current ||
      sessionRef.current ||
      streamRef.current ||
      statusRef.current === 'requesting'
    )
      return

    if (!window.isSecureContext) {
      reportError('Camera và micro cần kết nối an toàn. Mở trang bằng HTTPS hoặc localhost.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      reportError(
        'Trình duyệt này không hỗ trợ ghi camera và micro. Dùng trình duyệt hiện đại khác.',
      )
      return
    }

    const request = ++requestRef.current
    setError('')
    updateStatus('requesting')
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      if (!mountedRef.current || request !== requestRef.current) {
        nextStream.getTracks().forEach((track) => track.stop())
        return
      }
      const tracks = nextStream.getTracks()
      if (
        !nextStream.getAudioTracks().some((track) => track.readyState === 'live') ||
        !nextStream.getVideoTracks().some((track) => track.readyState === 'live')
      ) {
        tracks.forEach((track) => track.stop())
        reportError('Camera hoặc micro đã ngắt kết nối. Kết nối lại cả hai thiết bị rồi thử lại.')
        return
      }
      streamRef.current = nextStream
      setStream(nextStream)
      const onEnded = () => {
        if (sessionRef.current) sessionRef.current.failed = true
        void stopRecording()
        releaseStream()
        reportError(
          'Camera hoặc micro đã ngắt kết nối. Bản ghi trước vẫn được giữ. Kết nối lại thiết bị rồi thử lại.',
        )
      }
      tracks.forEach((track) => track.addEventListener('ended', onEnded))
      detachTracksRef.current = () =>
        tracks.forEach((track) => track.removeEventListener('ended', onEnded))
      updateStatus('ready')
    } catch (cause) {
      if (mountedRef.current && request === requestRef.current) reportError(permissionError(cause))
    }
  }, [releaseStream, reportError, stopRecording, updateStatus])

  const startRecording = useCallback(
    (questionId: string) => {
      const currentStream = streamRef.current
      if (
        !mountedRef.current ||
        devicesStoppingRef.current ||
        statusRef.current !== 'ready' ||
        sessionRef.current ||
        !currentStream
      )
        return

      let recorder: MediaRecorder
      try {
        const mimeType =
          typeof MediaRecorder.isTypeSupported === 'function'
            ? MIME_TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate))
            : undefined
        recorder = mimeType
          ? new MediaRecorder(currentStream, { mimeType })
          : new MediaRecorder(currentStream)
      } catch {
        releaseStream()
        reportError('Không tạo được bản ghi trên trình duyệt này. Hãy thử lại.')
        return
      }

      const chunks: Blob[] = []
      const startedAt = performance.now()
      let resolve!: RecordingSession['resolve']
      const done = new Promise<InterviewRecording | null>((finish) => {
        resolve = finish
      })
      const session: RecordingSession = {
        recorder,
        done,
        resolve,
        failed: false,
        stoppedAt: null,
        detach: () => {
          recorder.removeEventListener('dataavailable', onData)
          recorder.removeEventListener('stop', onStop)
          recorder.removeEventListener('error', onError)
        },
      }

      function onData(event: BlobEvent) {
        if (event.data.size > 0) chunks.push(event.data)
      }

      function onStop() {
        session.detach()
        if (sessionRef.current !== session) {
          resolve(null)
          return
        }
        sessionRef.current = null
        let recording: InterviewRecording | null = null
        if (mountedRef.current && !session.failed) {
          // Định dạng thực tế, kể cả khi để trình duyệt tự chọn MIME.
          const mimeType = recorder.mimeType || chunks.find((chunk) => chunk.type)?.type || ''
          const blob = new Blob(chunks, { type: mimeType })
          if (blob.size > 0) {
            try {
              recording = {
                questionId,
                blob,
                mimeType: blob.type,
                durationSeconds: Math.max(
                  0,
                  ((session.stoppedAt ?? performance.now()) - startedAt) / 1000,
                ),
                url: URL.createObjectURL(blob),
              }
              const previous = recordingsRef.current[questionId]
              recordingsRef.current = { ...recordingsRef.current, [questionId]: recording }
              setRecordings(recordingsRef.current)
              if (previous) URL.revokeObjectURL(previous.url)
              updateStatus(streamRef.current ? 'ready' : 'idle')
            } catch {
              releaseStream()
              reportError(
                'Không tạo được liên kết xem lại. Bản ghi trước vẫn được giữ; hãy thử lại.',
              )
            }
          } else {
            releaseStream()
            reportError('Bản ghi mới không có dữ liệu. Bản ghi trước vẫn được giữ; hãy thử lại.')
          }
        }
        resolve(recording)
      }

      function onError() {
        session.failed = true
        releaseStream()
        reportError('Ghi hình bị lỗi. Bản ghi trước vẫn được giữ; hãy thử lại.')
        void stopRecording()
      }

      recorder.addEventListener('dataavailable', onData)
      recorder.addEventListener('stop', onStop)
      recorder.addEventListener('error', onError)
      sessionRef.current = session
      try {
        recorder.start()
        setError('')
        updateStatus('recording')
      } catch {
        session.detach()
        sessionRef.current = null
        resolve(null)
        releaseStream()
        reportError('Không bắt đầu được bản ghi. Hãy thử lại.')
      }
    },
    [releaseStream, reportError, stopRecording, updateStatus],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestRef.current += 1
      const session = sessionRef.current
      sessionRef.current = null
      if (session) {
        session.detach()
        if (session.recorder.state !== 'inactive') {
          try {
            session.recorder.stop()
          } catch {
            /* Thiết bị có thể đã bị ngắt. */
          }
        }
        session.resolve(null)
      }
      releaseStream()
      Object.values(recordingsRef.current).forEach((recording) =>
        URL.revokeObjectURL(recording.url),
      )
      recordingsRef.current = {}
      statusRef.current = 'idle'
    }
  }, [releaseStream])

  return {
    status,
    error,
    stream,
    recordings,
    enableDevices,
    disableDevices,
    startRecording,
    stopRecording,
  }
}
