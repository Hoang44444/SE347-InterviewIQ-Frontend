import { useCallback, useEffect, useRef, useState } from 'react'

import {
  BLUR_GRACE_MS,
  CHEAT_EVENT_LABEL,
  FACE_SAMPLE_INTERVAL_MS,
  INTEGRITY_SEVERITY,
  INTEGRITY_TO_CHEAT_EVENT,
} from '@/constants/integrity'
import { createFaceDetector } from '@/services/faceDetector'
import type { CheatLogService, CheatSummary } from '@/types/cheat'
import type { FaceDetectorState, IntegrityEvent, IntegrityEventType } from '@/types/integrity'
import { createConditionTracker } from '@/utils/faceConditions'

export interface UseIntegrityMonitorOptions {
  /** Chỉ giám sát khi đã bắt đầu phỏng vấn và chưa nộp bài. */
  enabled: boolean
  stream: MediaStream | null
  /** Câu hỏi đang trả lời, gắn vào sự kiện mới. */
  questionId?: string
  /** Cùng với `cheatLogs`: có đủ cả hai thì mới gửi và nạp log lên backend. */
  sessionId?: string
  cheatLogs?: CheatLogService
}

/** Bộ đếm backend trả về có thể đến lệch thứ tự: giữ bản có tổng lớn hơn. */
function newerSummary(current: CheatSummary | null, next: CheatSummary): CheatSummary {
  return current && current.totalCount > next.totalCount ? current : next
}

/**
 * Ghi nhận tín hiệu nghi vấn (rời tab, thoát toàn màn hình, mất camera, không thấy mặt,
 * nhiều mặt, nhìn đi chỗ khác). Chỉ gắn cờ để người xem xét, không tự kết luận gian lận.
 *
 * Bốn loại backend hỗ trợ được gửi ngay khi sự kiện mở, mỗi sự kiện một request (backend
 * không chống trùng; việc gộp đã làm ở `open`). Ba loại còn lại chỉ nằm trong state.
 * Gửi lỗi thì bỏ qua: không được làm gián đoạn buổi phỏng vấn.
 */
export function useIntegrityMonitor({
  enabled,
  stream,
  questionId,
  sessionId,
  cheatLogs,
}: UseIntegrityMonitorOptions) {
  const [events, setEvents] = useState<IntegrityEvent[]>([])
  const [summary, setSummary] = useState<CheatSummary | null>(null)
  const [loadedState, setDetectorState] = useState<'idle' | 'ready' | 'unavailable'>('idle')
  const questionRef = useRef(questionId)
  const openRef = useRef(new Map<IntegrityEventType, string>())
  const counterRef = useRef(0)

  const cheatRef = useRef({ sessionId, cheatLogs })

  useEffect(() => {
    questionRef.current = questionId
    cheatRef.current = { sessionId, cheatLogs }
  }, [questionId, sessionId, cheatLogs])

  // Tải lại trang giữa chừng: lấy lại bộ đếm để cảnh báo không về 0.
  useEffect(() => {
    if (!sessionId || !cheatLogs) return
    let active = true
    cheatLogs
      .list(sessionId)
      .then((result) => {
        if (active) setSummary((current) => newerSummary(current, result.summary))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [sessionId, cheatLogs])

  /** Gửi một sự kiện lên backend nếu loại đó được hỗ trợ; không chờ và không báo lỗi. */
  const report = useCallback((type: IntegrityEventType, startedAt: string) => {
    const eventType = INTEGRITY_TO_CHEAT_EVENT[type]
    const { sessionId: id, cheatLogs: api } = cheatRef.current
    if (!eventType || !id || !api) return
    api
      .record(id, { eventType, occurredAt: startedAt, description: CHEAT_EVENT_LABEL[eventType] })
      .then((result) => setSummary((current) => newerSummary(current, result.summary)))
      .catch(() => {})
  }, [])

  /** Mở sự kiện mới; bỏ qua nếu cùng loại đang mở (vd. visibilitychange lặp). */
  const open = useCallback(
    (type: IntegrityEventType, startedAtMs: number = Date.now()) => {
      if (openRef.current.has(type)) return
      const id = `integrity-${++counterRef.current}`
      openRef.current.set(type, id)
      const event: IntegrityEvent = {
        id,
        type,
        severity: INTEGRITY_SEVERITY[type],
        questionId: questionRef.current,
        startedAt: new Date(startedAtMs).toISOString(),
      }
      setEvents((current) => [...current, event])
      report(type, event.startedAt)
    },
    [report],
  )

  const close = useCallback((type: IntegrityEventType, endedAtMs: number = Date.now()) => {
    const id = openRef.current.get(type)
    if (!id) return
    openRef.current.delete(type)
    setEvents((current) =>
      current.map((event) => {
        if (event.id !== id) return event
        const durationMs = Math.max(0, endedAtMs - Date.parse(event.startedAt))
        return { ...event, endedAt: new Date(endedAtMs).toISOString(), durationMs }
      }),
    )
  }, [])

  /** Sự kiện tức thời, không có khoảng thời gian (thoát toàn màn hình). */
  const instant = useCallback((type: IntegrityEventType) => {
    const now = Date.now()
    const event: IntegrityEvent = {
      id: `integrity-${++counterRef.current}`,
      type,
      severity: INTEGRITY_SEVERITY[type],
      questionId: questionRef.current,
      startedAt: new Date(now).toISOString(),
      endedAt: new Date(now).toISOString(),
      durationMs: 0,
    }
    setEvents((current) => [...current, event])
  }, [])

  // Tín hiệu từ trình duyệt: rời tab, mất focus, thoát toàn màn hình.
  useEffect(() => {
    if (!enabled) return
    let blurTimer = 0
    let wasFullscreen = !!document.fullscreenElement

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') open('TAB_HIDDEN')
      else close('TAB_HIDDEN')
    }
    const handleBlur = () => {
      // Đổi tab cũng bắn blur trước khi hidden: chờ một chút để không đếm trùng.
      window.clearTimeout(blurTimer)
      blurTimer = window.setTimeout(() => {
        if (document.visibilityState === 'visible' && !document.hasFocus()) open('WINDOW_BLUR')
      }, BLUR_GRACE_MS)
    }
    const handleFocus = () => {
      window.clearTimeout(blurTimer)
      close('WINDOW_BLUR')
    }
    const handleFullscreen = () => {
      const isFullscreen = !!document.fullscreenElement
      if (wasFullscreen && !isFullscreen) instant('FULLSCREEN_EXIT')
      wasFullscreen = isFullscreen
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('fullscreenchange', handleFullscreen)
    return () => {
      window.clearTimeout(blurTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('fullscreenchange', handleFullscreen)
      close('TAB_HIDDEN')
      close('WINDOW_BLUR')
    }
  }, [enabled, open, close, instant])

  // Camera bị rút, bị tắt quyền hoặc bị hệ điều hành ngắt.
  useEffect(() => {
    if (!enabled || !stream) return
    const tracks = stream.getVideoTracks()
    const cleanups = tracks.map((track) => {
      const lost = () => open('CAMERA_LOST')
      const back = () => {
        if (track.readyState === 'live') close('CAMERA_LOST')
      }
      track.addEventListener('ended', lost)
      track.addEventListener('mute', lost)
      track.addEventListener('unmute', back)
      return () => {
        track.removeEventListener('ended', lost)
        track.removeEventListener('mute', lost)
        track.removeEventListener('unmute', back)
      }
    })
    return () => {
      cleanups.forEach((cleanup) => cleanup())
      close('CAMERA_LOST')
    }
  }, [enabled, stream, open, close])

  // Nhận diện khuôn mặt trên một video ẩn riêng, không đụng tới khung xem trước.
  useEffect(() => {
    if (!enabled || !stream || stream.getVideoTracks().length === 0) return
    let cancelled = false
    let timer = 0
    let detector: Awaited<ReturnType<typeof createFaceDetector>> | null = null
    const tracker = createConditionTracker()
    // performance.now() -> epoch ms, để sự kiện có giờ thật.
    const epochOffset = Date.now() - performance.now()

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    // play() có thể trả về undefined (jsdom) hoặc reject (autoplay bị chặn): cả hai đều bỏ qua.
    void Promise.resolve(video.play()).catch(() => {})

    createFaceDetector()
      .then((created) => {
        if (cancelled) {
          created.close()
          return
        }
        detector = created
        setDetectorState('ready')
        timer = window.setInterval(() => {
          if (!detector || video.readyState < 2 || video.videoWidth === 0) return
          try {
            const { started, ended } = tracker.update(detector.detect(video, performance.now()))
            for (const { condition, startedAt } of started) open(condition, epochOffset + startedAt)
            for (const { condition, endedAt } of ended) close(condition, epochOffset + endedAt)
          } catch {
            // Một khung hình lỗi không được làm hỏng cả phiên giám sát.
          }
        }, FACE_SAMPLE_INTERVAL_MS)
      })
      .catch(() => {
        if (!cancelled) setDetectorState('unavailable')
      })

    return () => {
      cancelled = true
      window.clearInterval(timer)
      for (const { condition, endedAt } of tracker.flush(performance.now())) {
        close(condition, epochOffset + endedAt)
      }
      detector?.close()
      video.pause()
      video.srcObject = null
      setDetectorState('idle')
    }
  }, [enabled, stream, open, close])

  // 'loading' suy ra từ việc đang bật nhưng detector chưa báo kết quả, khỏi setState đồng bộ trong effect.
  const detectorState: FaceDetectorState =
    enabled && stream && loadedState === 'idle' ? 'loading' : loadedState
  const activeTypes = events.filter((event) => !event.endedAt).map((event) => event.type)

  return { events, activeTypes, detectorState, summary }
}
