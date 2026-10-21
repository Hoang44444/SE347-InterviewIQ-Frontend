import { useEffect, useRef, useState } from 'react'

import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { InterviewSession } from '@/types/interview'
import { isSessionId } from '@/utils/sessionId'

/** Khoá đồng bộ trước render, dùng chung cho danh sách và phòng thật. */
export function useStartInterviewSession({
  reload,
  onStarted,
}: {
  reload: () => Promise<void>
  onStarted: (session: InterviewSession) => void
}) {
  const [startingId, setStartingId] = useState<string | null>(null)
  const [isSynchronizing, setIsSynchronizing] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState('')
  const pendingRef = useRef(false)
  const blockedRef = useRef(false)
  const syncingRef = useRef(false)
  const startedRef = useRef(new Set<string>())
  const lifecycleRef = useRef(0)
  const activeRef = useRef(false)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
      lifecycleRef.current += 1
    }
  }, [])

  async function synchronize(): Promise<boolean> {
    if (!activeRef.current || syncingRef.current) return false
    const lifecycle = lifecycleRef.current
    syncingRef.current = true
    blockedRef.current = true
    setBlocked(true)
    setIsSynchronizing(true)
    try {
      await reload()
      if (!activeRef.current || lifecycle !== lifecycleRef.current) return false
      blockedRef.current = false
      setBlocked(false)
      return true
    } catch {
      // Dữ liệu cũ: giữ khoá tới khi đồng bộ thành công.
      return false
    } finally {
      if (activeRef.current && lifecycle === lifecycleRef.current) {
        syncingRef.current = false
        setIsSynchronizing(false)
      }
    }
  }

  async function start(session: InterviewSession) {
    if (
      !activeRef.current ||
      pendingRef.current ||
      blockedRef.current ||
      syncingRef.current ||
      session.status !== 'CREATED' ||
      !isSessionId(session.sessionPublicId) ||
      startedRef.current.has(session.sessionPublicId)
    )
      return

    const lifecycle = lifecycleRef.current
    pendingRef.current = true
    setStartingId(session.sessionPublicId)
    setError('')
    try {
      const result = await interviewService.startSession(session.sessionPublicId)
      if (!activeRef.current || lifecycle !== lifecycleRef.current) return
      startedRef.current.add(result.sessionPublicId)
      onStarted({ ...session, ...result })
    } catch (cause) {
      if (!activeRef.current || lifecycle !== lifecycleRef.current) return
      const status = (cause as ApiError).status
      if (status === 401) return // Interceptor hiện có chuyển tới đăng nhập.
      setError(
        status === 409
          ? 'Phiên phỏng vấn đã bắt đầu hoặc không còn có thể bắt đầu'
          : status === 404
            ? 'Phiên phỏng vấn không còn khả dụng'
            : status === 400
              ? 'Thông tin phiên phỏng vấn không hợp lệ'
              : status === 403
                ? 'Bạn không có quyền bắt đầu phiên phỏng vấn'
                : 'Không thể bắt đầu phiên phỏng vấn. Hãy thử lại',
      )
      if (status === 404 || status === 409) {
        setStartingId(null)
        await synchronize()
      }
    } finally {
      if (activeRef.current && lifecycle === lifecycleRef.current) {
        pendingRef.current = false
        setStartingId(null)
      }
    }
  }

  async function retryLoad() {
    if (pendingRef.current) return
    if (await synchronize()) setError('')
  }

  return {
    start,
    retryLoad,
    startingId,
    isSynchronizing,
    error,
    isLocked: startingId !== null || blocked || isSynchronizing,
  }
}
