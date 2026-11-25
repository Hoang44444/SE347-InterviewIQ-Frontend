import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CreatedSessionContent } from '@/components/interview/CreatedSessionContent'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Stack } from '@/components/ui'
import { historyActionLabel } from '@/constants/history'
import { SESSION_STATUS_LABEL, SESSION_STATUS_TONE } from '@/constants/interview'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStartInterviewSession } from '@/hooks/useStartInterviewSession'
import { ROUTES } from '@/routes/paths'
import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { InterviewRoomLocationState, InterviewSession } from '@/types/interview'
import { formatDate } from '@/utils/format'
import { isSessionId } from '@/utils/sessionId'

/**
 * Cổng vào phòng theo trạng thái phiên: CREATED thì sinh câu hỏi và bắt đầu,
 * IN_PROGRESS thì mở phòng ghi hình, các trạng thái đã đóng thì dẫn sang kết quả.
 */
export function InterviewSessionRoom({
  id,
  knownSession,
  liveRoom,
}: {
  id: string
  knownSession?: InterviewSession
  /** Phòng ghi hình, chỉ được gắn khi phiên đang diễn ra. */
  liveRoom: ReactNode
}) {
  const navigate = useNavigate()
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [isLoading, setIsLoading] = useState(() => isSessionId(id))
  const [loadError, setLoadError] = useState('')
  const requestRef = useRef(0)
  // Giữ timestamp đã nhận từ Start, không dùng navigation state để xác nhận trạng thái.
  const knownSessionRef = useRef(knownSession)
  useDocumentTitle(session?.title || 'Phòng phỏng vấn')

  const loadSession = useCallback(async () => {
    if (!isSessionId(id)) return
    const request = ++requestRef.current
    try {
      let found: InterviewSession | null = null
      let pageNumber = 1
      while (true) {
        const page = await interviewService.listSessions(pageNumber, 20)
        if (request !== requestRef.current) return
        found = page.items.find((item) => item.sessionPublicId === id) ?? null
        if (found || !page.hasNext) break
        pageNumber += 1
      }
      if (request !== requestRef.current) return
      const known = knownSessionRef.current
      if (found?.status === 'IN_PROGRESS' && known?.sessionPublicId === id && known.startedAt) {
        found = { ...found, startedAt: known.startedAt }
      }
      setSession(found)
      setLoadError('')
    } catch (cause) {
      if (request === requestRef.current)
        setLoadError((cause as ApiError).message || 'Hãy thử lại.')
      throw cause
    } finally {
      if (request === requestRef.current) setIsLoading(false)
    }
  }, [id])

  const start = useStartInterviewSession({
    reload: loadSession,
    onStarted: (updated) => {
      knownSessionRef.current = updated
      setSession(updated)
      const state: InterviewRoomLocationState = { session: updated }
      navigate(ROUTES.interviewRoom(updated.sessionPublicId), { replace: true, state })
    },
  })

  useEffect(() => {
    void loadSession().catch(() => {})
    return () => {
      requestRef.current += 1
    }
  }, [loadSession])

  if (session?.status === 'IN_PROGRESS') {
    return (
      <Stack gap="lg">
        {/* Bấm Bắt đầu bị 409 rồi đồng bộ thấy phiên đã chạy: vẫn phải nói lý do. */}
        {start.error && (
          <p role="alert" className="text-sm text-danger-700">
            {start.error}
          </p>
        )}
        {liveRoom}
      </Stack>
    )
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title={session?.title || 'Phòng phỏng vấn'}
        actions={
          session ? (
            <Badge tone={SESSION_STATUS_TONE[session.status]}>
              {SESSION_STATUS_LABEL[session.status]}
            </Badge>
          ) : undefined
        }
      />
      {start.error && (
        <p role="alert" className="text-sm text-danger-700">
          {start.error}
        </p>
      )}
      {start.isSynchronizing && (
        <p role="status" className="text-sm text-content-muted">
          Đang đồng bộ phiên phỏng vấn…
        </p>
      )}
      {loadError && (
        <Stack gap="sm">
          <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
            Chưa tải được buổi phỏng vấn: {loadError}
          </p>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => void start.retryLoad()}
            disabled={isLoading || start.isSynchronizing}
          >
            Tải lại
          </Button>
        </Stack>
      )}
      {isLoading ? (
        <div
          role="status"
          aria-label="Đang tải phòng phỏng vấn"
          className="flex justify-center py-16"
        >
          <Spinner size="lg" />
        </div>
      ) : session ? (
        <Card padding="xl">
          {session.status === 'CREATED' ? (
            <CreatedSessionContent
              session={session}
              onStart={() => void start.start(session)}
              isStarting={start.startingId === session.sessionPublicId}
              startDisabled={isLoading || !!loadError || start.isLocked}
            />
          ) : (
            <Stack gap="lg">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-content-subtle">Số câu hỏi</dt>
                  <dd className="mt-1 font-medium text-content">{session.totalQuestion} câu hỏi</dd>
                </div>
                <div>
                  <dt className="text-sm text-content-subtle">Ngày tạo</dt>
                  <dd className="mt-1 font-medium text-content">{formatDate(session.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-content-subtle">CV</dt>
                  <dd className="mt-1 wrap-anywhere text-content">
                    {session.cvPublicId || 'Không có CV gắn với phiên'}
                  </dd>
                </div>
                {session.jobDescription && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-content-subtle">Mô tả công việc / JD</dt>
                    <dd className="mt-1 wrap-anywhere whitespace-pre-wrap text-content">
                      {session.jobDescription}
                    </dd>
                  </div>
                )}
              </dl>
              <div>
                <h2 className="text-xl font-semibold text-content">Buổi phỏng vấn đã đóng</h2>
                <p className="mt-2 text-content-muted">
                  Buổi này không thể làm tiếp.{' '}
                  <Link
                    to={ROUTES.historyDetail(session.sessionPublicId)}
                    className="rounded-control font-medium text-brand-600 hover:underline focus-visible:outline-brand-600"
                  >
                    {historyActionLabel(session.status)}
                  </Link>
                </p>
              </div>
            </Stack>
          )}
        </Card>
      ) : !loadError ? (
        <EmptyState
          title="Phiên phỏng vấn không còn khả dụng"
          description="Không tìm thấy phiên phỏng vấn trong danh sách của bạn."
        />
      ) : null}
      <Link
        to={ROUTES.interviews}
        className="self-start rounded-control px-4 py-3 text-sm font-medium text-brand-600 hover:underline focus-visible:outline-brand-600"
      >
        Về danh sách
      </Link>
    </Stack>
  )
}
