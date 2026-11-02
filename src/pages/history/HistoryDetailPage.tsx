import { Link, useParams } from 'react-router-dom'

import { HistoryResultPanel, HistoryTimeline } from '@/components/history'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Stack } from '@/components/ui'
import { SESSION_STATUS_LABEL, SESSION_STATUS_TONE } from '@/constants/interview'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useInterviewHistoryDetail } from '@/hooks/useInterviewHistoryDetail'
import { useSessionResult } from '@/hooks/useSessionResult'
import { ROUTES } from '@/routes/paths'
import type { InterviewHistoryDetail } from '@/types/history'
import { formatDurationLabel } from '@/utils/format'

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { detail, isLoading, loadError, isNotFound, reload } = useInterviewHistoryDetail(id)

  useDocumentTitle(detail ? detail.title || 'Buổi phỏng vấn' : 'Chi tiết buổi phỏng vấn')

  /**
   * Chỉ buổi đã hoàn thành mới có kết quả chấm; gọi cho trạng thái khác chỉ nhận
   * về 400. Điều kiện `detail.score === null` để khi Scoring module đổ dữ liệu
   * vào API lịch sử thì hook này tự ngừng gọi thêm một request nữa.
   */
  const sessionResult = useSessionResult(
    detail?.id ?? null,
    detail?.status === 'COMPLETED' && detail.score === null,
  )

  /**
   * Buổi đã hoàn thành thì "kiểm tra lại" là tải lại kết quả chấm. Các trạng
   * thái khác thì tải lại chính chi tiết: thứ người dùng đang đợi là trạng thái
   * chuyển sang COMPLETED, chứ không phải một kết quả chưa thể tồn tại.
   */
  function handleRetryResult() {
    if (detail?.status === 'COMPLETED') sessionResult.reload()
    else reload()
  }

  const backLink = (
    <Link
      to={ROUTES.history}
      className="text-sm text-brand-600 underline-offset-4 hover:underline focus-visible:outline-brand-600"
    >
      &lsaquo; Lịch sử phỏng vấn
    </Link>
  )

  if (isLoading) {
    return (
      <div role="status" aria-label="Đang tải chi tiết" className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  // 404 của backend gộp "không tồn tại" và "của người khác" để không ai dò được
  // id nào có thật, nên thông báo ở đây cũng không đoán là trường hợp nào.
  if (isNotFound) {
    return (
      <Stack gap="lg">
        {backLink}
        <EmptyState
          title="Không tìm thấy buổi phỏng vấn"
          description="Buổi này không tồn tại hoặc không thuộc tài khoản của bạn."
          action={
            <Link
              to={ROUTES.history}
              className="inline-flex h-10 items-center justify-center rounded-control bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Về danh sách
            </Link>
          }
        />
      </Stack>
    )
  }

  if (!detail) {
    return (
      <Stack gap="lg">
        {backLink}
        <Stack gap="sm">
          <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
            Chưa tải được buổi phỏng vấn: {loadError || 'Hãy thử lại.'}
          </p>
          <Button variant="secondary" className="self-start" onClick={reload}>
            Tải lại
          </Button>
        </Stack>
      </Stack>
    )
  }

  return (
    <Stack gap="lg">
      {backLink}

      <PageHeader
        title={detail.title || 'Buổi phỏng vấn'}
        actions={
          <Badge tone={SESSION_STATUS_TONE[detail.status]}>
            {SESSION_STATUS_LABEL[detail.status]}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <HistoryResultPanel
          status={detail.status}
          result={sessionResult.result}
          isLoading={sessionResult.isLoading}
          loadError={sessionResult.loadError}
          onRetry={handleRetryResult}
          roomTo={ROUTES.interviewRoom(detail.id)}
        />

        <Stack gap="md">
          <Card padding="lg">
            <Stack gap="md">
              <h2 className="font-semibold text-content">Thông tin buổi</h2>
              <SessionFacts detail={detail} />
            </Stack>
          </Card>

          <Card padding="lg">
            <Stack gap="md">
              <h2 className="font-semibold text-content">Tiến trình</h2>
              <HistoryTimeline detail={detail} />
            </Stack>
          </Card>

          {detail.jobDescription && (
            <Card padding="lg">
              <Stack gap="md">
                <h2 className="font-semibold text-content">Mô tả công việc</h2>
                <p className="text-sm whitespace-pre-line text-content-muted wrap-anywhere">
                  {detail.jobDescription}
                </p>
              </Stack>
            </Card>
          )}
        </Stack>
      </div>
    </Stack>
  )
}

function SessionFacts({ detail }: { detail: InterviewHistoryDetail }) {
  return (
    <dl className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-sm text-content-muted">Số câu hỏi</dt>
        <dd className="text-sm font-medium text-content tabular-nums">{detail.totalQuestions}</dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt className="text-sm text-content-muted">Thời lượng</dt>
        <dd className="text-sm font-medium text-content tabular-nums">
          {formatDurationLabel(detail.durationSeconds)}
        </dd>
      </div>
      <div className="flex items-start justify-between gap-4">
        <dt className="text-sm text-content-muted">CV</dt>
        {/*
          Quan hệ CV là onDelete: SetNull, nên null ở đây có thể là chưa gắn CV
          hoặc CV đã bị xoá. Nói rõ là không còn, đừng để ô trống.
        */}
        <dd className="min-w-0 text-right text-sm font-medium text-content wrap-anywhere">
          {detail.cv ? detail.cv.fileName : <span className="text-content-subtle">Không còn</span>}
        </dd>
      </div>
    </dl>
  )
}
