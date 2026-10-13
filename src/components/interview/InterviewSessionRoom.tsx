import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Stack } from '@/components/ui'
import { SESSION_STATUS_LABEL, SESSION_STATUS_TONE } from '@/constants/interview'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStartInterviewSession } from '@/hooks/useStartInterviewSession'
import { ROUTES } from '@/routes/paths'
import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { InterviewRoomLocationState, InterviewSession } from '@/types/interview'
import { formatDate } from '@/utils/format'
import { isSessionId } from '@/utils/sessionId'

export function InterviewSessionRoom({
  id,
  knownSession,
}: {
  id: string
  knownSession?: InterviewSession
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
            {session.startedAt && (
              <p className="text-sm text-content-muted">
                Bắt đầu lúc{' '}
                <time dateTime={session.startedAt}>
                  {new Intl.DateTimeFormat('vi-VN', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  }).format(new Date(session.startedAt))}
                </time>
              </p>
            )}
            <div>
              <h2 className="text-xl font-semibold text-content">Đang chờ nội dung câu hỏi</h2>
              <p className="mt-2 text-content-muted">
                Nội dung câu hỏi chưa có sẵn trong phòng này.
              </p>
            </div>
            {session.status === 'CREATED' && (
              <Button
                size="lg"
                className="self-start"
                onClick={() => void start.start(session)}
                isLoading={start.startingId === session.sessionPublicId}
                disabled={isLoading || !!loadError || start.isLocked}
              >
                Bắt đầu
              </Button>
            )}
          </Stack>
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
