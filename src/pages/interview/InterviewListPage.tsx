import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CreateInterviewModal } from '@/components/interview/CreateInterviewModal'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Stack } from '@/components/ui'
import { SESSION_STATUS_LABEL, SESSION_STATUS_TONE } from '@/constants/interview'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useStartInterviewSession } from '@/hooks/useStartInterviewSession'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import { interviewService } from '@/services/interviewService'
import type { ApiError, PageResult } from '@/types/api'
import type {
  CreatedInterviewSession,
  InterviewSession,
  InterviewRoomLocationState,
} from '@/types/interview'
import { formatDate } from '@/utils/format'
import { isSessionId } from '@/utils/sessionId'

export function InterviewListPage() {
  useDocumentTitle('Phòng phỏng vấn')
  const toast = useToast()
  const navigate = useNavigate()
  const [pageNumber, setPageNumber] = useState(1)
  const [page, setPage] = useState<PageResult<InterviewSession> | null>(null)
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const requestRef = useRef(0)

  const loadPage = useCallback(() => {
    const request = ++requestRef.current
    return interviewService
      .listSessions(pageNumber, 20)
      .then((result) => {
        if (request !== requestRef.current) return
        setPage(result)
        setLoadError('')
      })
      .catch((cause: ApiError) => {
        if (request === requestRef.current) setLoadError(cause.message || 'Hãy thử lại.')
        throw cause
      })
      .finally(() => {
        if (request === requestRef.current) setIsLoading(false)
      })
  }, [pageNumber])

  const start = useStartInterviewSession({
    reload: loadPage,
    onStarted: (session) => {
      setPage((previous) =>
        previous
          ? {
              ...previous,
              items: previous.items.map((item) =>
                item.sessionPublicId === session.sessionPublicId ? session : item,
              ),
            }
          : previous,
      )
      const state: InterviewRoomLocationState = { session }
      navigate(ROUTES.interviewRoom(session.sessionPublicId), { state })
    },
  })

  useEffect(() => {
    void loadPage().catch(() => {})
    return () => {
      requestRef.current += 1
    }
  }, [loadPage])

  function handleCreated(createdSession: CreatedInterviewSession) {
    setIsModalOpen(false)
    toast.success('Đã tạo phòng phỏng vấn', createdSession.title)
    const state: InterviewRoomLocationState = { createdSession }
    navigate(ROUTES.interviewRoom(createdSession.publicId), { state })
  }

  function changePage(nextPage: number) {
    setIsLoading(true)
    setLoadError('')
    setPageNumber(nextPage)
  }

  const items = page?.items ?? []
  const isEmptyAccount =
    items.length === 0 && pageNumber === 1 && !page?.hasNext && !page?.hasPrevious

  return (
    <Stack gap="lg">
      <PageHeader
        title="Phòng phỏng vấn"
        description="Danh sách các buổi luyện tập của bạn."
        actions={<Button onClick={() => setIsModalOpen(true)}>Tạo buổi mới</Button>}
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
            Chưa tải được danh sách: {loadError}
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
        <div role="status" aria-label="Đang tải danh sách" className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {!loadError && items.length === 0 && (
            <EmptyState
              title={
                isEmptyAccount ? 'Chưa có buổi phỏng vấn nào' : 'Trang này không có buổi phỏng vấn'
              }
              description={
                isEmptyAccount
                  ? 'Tạo buổi đầu tiên để bắt đầu luyện tập.'
                  : 'Chọn trang trước để xem các buổi phỏng vấn khác.'
              }
              action={
                isEmptyAccount ? (
                  <Button onClick={() => setIsModalOpen(true)}>Tạo buổi mới</Button>
                ) : undefined
              }
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((session) => (
              <Card key={session.sessionPublicId} className="h-full">
                <Stack gap="md">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 wrap-anywhere font-semibold text-content">
                      <Link
                        to={ROUTES.interviewRoom(session.sessionPublicId)}
                        className="hover:underline focus-visible:outline-brand-600"
                      >
                        {session.title || 'Phòng phỏng vấn'}
                      </Link>
                    </h2>
                    <Badge tone={SESSION_STATUS_TONE[session.status]}>
                      {SESSION_STATUS_LABEL[session.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-content-subtle">
                    {session.totalQuestion} câu hỏi &middot; {formatDate(session.createdAt)}
                  </p>
                  {session.status === 'CREATED' && (
                    <Button
                      className="self-start"
                      onClick={() => void start.start(session)}
                      disabled={
                        start.isLocked || !!loadError || !isSessionId(session.sessionPublicId)
                      }
                      isLoading={start.startingId === session.sessionPublicId}
                    >
                      Bắt đầu
                    </Button>
                  )}
                </Stack>
              </Card>
            ))}
          </div>
        </>
      )}
      {page && (
        <nav
          aria-label="Phân trang buổi phỏng vấn"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-content-muted">
            Trang {page.currentPage} / {Math.max(1, page.totalPages)}
          </p>
          <Stack direction="row" gap="sm">
            <Button
              variant="secondary"
              disabled={!page.hasPrevious || isLoading || start.isLocked || !!loadError}
              onClick={() => changePage(page.currentPage - 1)}
            >
              Trang trước
            </Button>
            <Button
              variant="secondary"
              disabled={!page.hasNext || isLoading || start.isLocked || !!loadError}
              onClick={() => changePage(page.currentPage + 1)}
            >
              Trang sau
            </Button>
          </Stack>
        </nav>
      )}
      {isModalOpen && (
        <CreateInterviewModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}
    </Stack>
  )
}
