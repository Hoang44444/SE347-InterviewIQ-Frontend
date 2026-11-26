import { useEffect, useRef, useState } from 'react'

import { openScoringStream } from '@/services/scoringStreamService'
import type { ScoringJobEvent, ScoringStreamConnectionState } from '@/types/scoring'

export interface UseScoringStreamOptions {
  enabled: boolean
  sessionId: string | null
  onScored?: (event: ScoringJobEvent) => void
  onFailed?: (error: string, event: ScoringJobEvent) => void
  onConnected?: () => void
  onReconnected?: () => void
}

const DEFAULT_FAILURE_MESSAGE = 'Không thể chấm điểm buổi phỏng vấn này.'

/**
 * Quản lý vòng đời kết nối SSE chấm điểm trong React.
 *
 * Chỉ chuyển tiếp sự kiện thuộc đúng sessionId đang xem; callback giữ qua ref
 * nên đổi callback ở component cha không làm đóng/mở lại kết nối.
 */
export function useScoringStream({
  enabled,
  sessionId,
  onScored,
  onFailed,
  onConnected,
  onReconnected,
}: UseScoringStreamOptions): { connectionState: ScoringStreamConnectionState } {
  const [streamState, setStreamState] = useState<ScoringStreamConnectionState>('idle')
  const callbacksRef = useRef({ onScored, onFailed, onConnected, onReconnected })

  useEffect(() => {
    callbacksRef.current = { onScored, onFailed, onConnected, onReconnected }
  }, [onScored, onFailed, onConnected, onReconnected])

  const isActive = enabled && sessionId !== null

  useEffect(() => {
    if (!isActive) return

    const controller = new AbortController()
    void openScoringStream({
      signal: controller.signal,
      onStateChange: (nextState) => {
        if (!controller.signal.aborted) setStreamState(nextState)
      },
      onOpen: (isReconnect) => {
        if (controller.signal.aborted) return
        callbacksRef.current.onConnected?.()
        if (isReconnect) callbacksRef.current.onReconnected?.()
      },
      onEvent: (event) => {
        if (controller.signal.aborted || event.payload.sessionId !== sessionId) return
        if (event.type === 'answer-scored') {
          callbacksRef.current.onScored?.(event)
        } else if (event.type === 'answer-failed') {
          callbacksRef.current.onFailed?.(event.payload.error || DEFAULT_FAILURE_MESSAGE, event)
        }
      },
    })

    return () => {
      controller.abort()
    }
  }, [isActive, sessionId])

  return {
    connectionState: isActive ? streamState : 'idle',
  }
}
