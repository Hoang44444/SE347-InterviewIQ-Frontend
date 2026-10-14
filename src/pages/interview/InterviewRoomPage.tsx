import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { InterviewSessionRoom } from '@/components/interview/InterviewSessionRoom'
import { InterviewRecorder, QuestionNavigator, RecordingPlayback } from '@/components/interview'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  Stack,
  Textarea,
} from '@/components/ui'
import { KIND_LABEL, KIND_TONE, STATUS_LABEL, STATUS_TONE } from '@/constants/interview'
import { useInterviewClock } from '@/hooks/useInterviewClock'
import { useAnswerSubmission } from '@/hooks/useAnswerSubmission'
import { useSessionSubmission } from '@/hooks/useSessionSubmission'
import { useScoringJob } from '@/hooks/useScoringJob'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useInterviewRecorder } from '@/hooks/useInterviewRecorder'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type {
  Interview,
  InterviewRoomLocationState,
  InterviewRoomService,
  Question,
} from '@/types/interview'
import { formatDuration } from '@/utils/format'

export function InterviewRoomPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { state } = useLocation()
  const session = (state as InterviewRoomLocationState | null)?.session
  return <InterviewSessionRoom key={id} id={id} knownSession={session} />
}

export function InterviewRoom({
  id,
  service = interviewService,
}: {
  id: string
  service?: InterviewRoomService
}) {
  const toast = useToast()
  const recorder = useInterviewRecorder()
  const { stopRecording, disableDevices } = recorder

  const [interview, setInterview] = useState<Interview | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  /** Đổi giá trị này để chạy lại effect tải dữ liệu (nút "Thử lại"). */
  const [reloadToken, setReloadToken] = useState(0)

  const [currentIndex, setCurrentIndex] = useState(0)
  /** Nội dung đang gõ, chưa gửi lên máy chủ. */
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  /** Câu trả lời đã gửi thành công, dùng để đánh dấu tiến độ và xem tổng kết. */
  const answerSubmission = useAnswerSubmission(id, service)
  const { savedAnswers } = answerSubmission
  const [answerDurations, setAnswerDurations] = useState<Record<string, number>>({})
  const [isFinalizing, setIsFinalizing] = useState(false)
  // Ref khoá ngay cả hai click/Ctrl+Enter trước khi React kịp render disabled.
  const actionRef = useRef(false)
  const activeRef = useRef(false)

  const [isFinishOpen, setIsFinishOpen] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const { clock, elapsed } = useInterviewClock(isStarted)
  const sessionSubmission = useSessionSubmission(id, service, clock)
  const { timing: sessionTiming, submission, isSubmitting } = sessionSubmission
  const isFinished = sessionTiming !== null
  const scoring = useScoringJob(submission?.jobId ?? null, service)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  useDocumentTitle(interview ? interview.title : 'Phòng phỏng vấn')

  useEffect(() => {
    let active = true

    Promise.all([service.getById(id), service.getQuestions(id)])
      .then(([detail, list]) => {
        if (!active) return

        setInterview(detail)
        setQuestions(list)
        setCurrentIndex(0)
      })
      .catch((err: ApiError) => {
        if (active) setLoadError(err.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, reloadToken, service])

  const currentQuestion = questions[currentIndex]
  const currentDraft = currentQuestion ? (drafts[currentQuestion.id] ?? '') : ''
  const answeredIds = useMemo(() => new Set(Object.keys(savedAnswers)), [savedAnswers])

  const hasUnsaved = questions.some(
    (question) => (drafts[question.id] ?? '').trim() !== '' && !answeredIds.has(question.id),
  )

  const hasRecordings = Object.keys(recorder.recordings).length > 0
  const hasUnsavedRecordings = Object.keys(recorder.recordings).some(
    (questionId) => !answeredIds.has(questionId),
  )
  const isSaving = isFinalizing || answerSubmission.phase !== 'idle'
  const isBusy = isSaving || isSubmitting || recorder.status === 'stopping'
  const isPermissionPending = recorder.status === 'requesting'
  const canSubmitSession =
    questions.length > 0 &&
    questions.every((question) => savedAnswers[question.id]) &&
    !!interview?.cvPublicId &&
    !isBusy &&
    !isPermissionPending &&
    !answerSubmission.blocked &&
    !isFinished
  const shouldWarnOnLeave =
    !submission &&
    ((isStarted && !isFinished) ||
      hasUnsaved ||
      hasUnsavedRecordings ||
      isFinished ||
      recorder.status === 'recording' ||
      recorder.status === 'stopping')
  const saveStatus = isFinalizing
    ? 'Đang chốt bản ghi'
    : answerSubmission.phase === 'uploading'
      ? 'Đang upload video'
      : answerSubmission.phase === 'saving'
        ? 'Đang lưu câu trả lời'
        : ''

  useEffect(() => {
    if (!shouldWarnOnLeave) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [shouldWarnOnLeave])

  function handleStart() {
    if (!currentQuestion || isStarted || actionRef.current) return
    clock.start(currentQuestion.id)
    setIsStarted(true)
  }

  function handleDraftChange(value: string) {
    if (
      !currentQuestion ||
      !isStarted ||
      isFinished ||
      answeredIds.has(currentQuestion.id) ||
      actionRef.current ||
      value.length > 50000
    )
      return
    setDrafts((previous) => ({ ...previous, [currentQuestion.id]: value }))
  }

  async function handleSave() {
    if (
      !currentQuestion ||
      !isStarted ||
      answeredIds.has(currentQuestion.id) ||
      actionRef.current ||
      isBusy ||
      isPermissionPending
    )
      return

    if (isFinished || answerSubmission.blocked) return
    if (!recorder.recordings[currentQuestion.id] && recorder.status !== 'recording') {
      toast.warning(
        'Cần có video',
        'Hãy bật camera và micro rồi ghi video cho câu này trước khi nộp.',
      )
      return
    }
    actionRef.current = true
    const answerSeconds = clock.submitQuestion()
    setIsFinalizing(true)
    try {
      const wasRecording = recorder.status === 'recording'
      const finalized = await stopRecording()
      if (!activeRef.current) return
      // Nếu bản ghi đang ghi bị lỗi, không tự nộp bản ghi cũ thay cho bản vừa ghi.
      if (wasRecording && !finalized)
        throw new Error('Không chốt được bản ghi mới. Hãy kiểm tra bản ghi và thử lại.')
      setIsFinalizing(false)
      const answer = await answerSubmission.save(
        currentQuestion.id,
        currentDraft,
        finalized ?? recorder.recordings[currentQuestion.id],
      )
      if (!activeRef.current || !answer) return
      setAnswerDurations((previous) => ({ ...previous, [currentQuestion.id]: answerSeconds }))
      toast.success('Đã lưu câu trả lời', `Câu ${currentIndex + 1}/${questions.length}`)
      const nextQuestion = questions[currentIndex + 1]
      if (nextQuestion) {
        clock.openQuestion(nextQuestion.id)
        setCurrentIndex(currentIndex + 1)
      }
    } catch (err) {
      if (!activeRef.current) return
      toast.error('Không lưu được câu trả lời', (err as ApiError).message)
      clock.resumeQuestion()
    } finally {
      actionRef.current = false
      if (activeRef.current) setIsFinalizing(false)
    }
  }

  /** Ctrl/Cmd + Enter để lưu nhanh, khỏi rời tay khỏi bàn phím. */
  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleSave()
    }
  }

  async function handleFinish() {
    if (actionRef.current || isBusy || !isStarted || !interview || answerSubmission.blocked) return
    if (!canSubmitSession && !sessionSubmission.canRetry) return
    actionRef.current = true
    setIsFinishOpen(false)
    try {
      await sessionSubmission.submit(
        {
          cvPublicId: interview.cvPublicId,
          questionIds: questions.map((question) => question.id),
          savedAnswers,
          isPending: isBusy,
        },
        disableDevices,
      )
    } finally {
      actionRef.current = false
    }
  }

  function handleRetry() {
    setLoadError('')
    setIsLoading(true)
    setReloadToken((token) => token + 1)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (loadError) {
    return (
      <Stack gap="lg">
        <PageHeader title="Phòng phỏng vấn" />
        <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
          Chưa tải được buổi phỏng vấn: {loadError}. Kiểm tra backend và biến VITE_API_URL trong
          file .env.
        </p>
        <Stack direction="row" gap="sm">
          <Button onClick={handleRetry}>Thử lại</Button>
          <Link to={ROUTES.interviews}>
            <Button variant="secondary">Về danh sách</Button>
          </Link>
        </Stack>
      </Stack>
    )
  }

  if (!interview || questions.length === 0) {
    return (
      <Stack gap="lg">
        <PageHeader title={interview ? interview.title : 'Phòng phỏng vấn'} />
        <EmptyState
          title="Buổi này chưa có câu hỏi nào"
          description="Phòng hiện chưa có câu hỏi để bắt đầu phỏng vấn."
          action={
            <Link to={ROUTES.interviews}>
              <Button variant="secondary">Về danh sách</Button>
            </Link>
          }
        />
      </Stack>
    )
  }

  if (isFinished) {
    return (
      <Stack gap="lg">
        <PageHeader
          title={
            !submission
              ? 'Session đã chốt để nộp'
              : scoring.job?.status === 'COMPLETED'
                ? 'Đã nộp — đã chấm điểm'
                : scoring.job?.status === 'FAILED'
                  ? 'Đã nộp — chấm điểm thất bại'
                  : 'Đã nộp — đang chấm điểm'
          }
          description={interview.title}
        />
        <Card>
          <Stack gap="md">
            {isSubmitting && <p role="status">Đang nộp session</p>}
            {sessionSubmission.error && (
              <p role="alert" className="text-sm text-danger-700">
                {sessionSubmission.error}
              </p>
            )}
            {sessionSubmission.canRetry && (
              <>
                <p className="text-sm text-content-muted">
                  Session có thể đã được lưu trên máy chủ. Thời gian và câu trả lời đã khóa; thử nộp
                  lại để bắt đầu chấm điểm.
                </p>
                <Button onClick={handleFinish} isLoading={isSubmitting} className="self-start">
                  Thử nộp session lại
                </Button>
              </>
            )}
            {submission && (
              <>
                <p role="status">
                  {scoring.job?.status === 'COMPLETED'
                    ? 'Đã chấm điểm xong'
                    : scoring.job?.status === 'FAILED'
                      ? 'Chấm điểm thất bại'
                      : 'Đã nộp — đang chấm điểm'}
                </p>
                <p className="text-sm text-content-subtle">
                  {scoring.job?.status === 'COMPLETED'
                    ? 'Chấm điểm đã hoàn tất. Kết quả điểm chưa được trả về trong trạng thái job.'
                    : 'Theo dõi tiến độ chấm điểm cho session đã nộp.'}
                </p>
                {scoring.error && (
                  <>
                    <p role="alert" className="text-sm text-danger-700">
                      {scoring.error}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={scoring.checkAgain}
                      isLoading={scoring.isChecking}
                      className="self-start"
                    >
                      Thử kiểm tra lại
                    </Button>
                  </>
                )}
              </>
            )}
          </Stack>
        </Card>
        <Card padding="xl">
          <dl className="grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-content-subtle">Đã trả lời</dt>
              <dd className="mt-1 text-2xl font-semibold text-content">
                {answeredIds.size}/{questions.length}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-content-subtle">Tổng thời gian</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold text-content">
                {formatDuration(sessionTiming?.durationSeconds ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-content-subtle">Vị trí</dt>
              <dd className="mt-1 text-2xl font-semibold text-content">{interview.position}</dd>
            </div>
          </dl>

          <Stack direction="row" gap="sm" className="mt-8">
            <Link to={ROUTES.interviews}>
              <Button>Về danh sách</Button>
            </Link>
          </Stack>
        </Card>
        <Card>
          <Stack gap="lg">
            <h2 className="text-lg font-semibold text-content">Câu trả lời đã nộp</h2>
            {questions.map((question, index) => {
              const answer = savedAnswers[question.id]
              return answer ? (
                <Stack key={question.id} gap="sm">
                  <h3 className="font-medium text-content">
                    Câu {index + 1}: {question.content}
                  </h3>
                  <p className="text-sm text-content-subtle">
                    Thời gian trả lời: {formatDuration(answerDurations[question.id] ?? 0)}
                  </p>
                  <p className="text-sm text-content-subtle">
                    Thời lượng video: {formatDuration(answer.durationSeconds)}
                  </p>
                  <p className="wrap-anywhere whitespace-pre-wrap text-content-muted">
                    {answer.transcript || 'Transcript rỗng'}
                  </p>
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={answer.videoUrl}
                    aria-label={`Video đã lưu câu ${index + 1}`}
                    className="aspect-video w-full rounded-control bg-surface-sunken"
                  />
                </Stack>
              ) : null
            })}
          </Stack>
        </Card>
        {hasRecordings && (
          <Card>
            <Stack gap="lg">
              <h2 className="text-lg font-semibold text-content">Bản ghi trong phòng</h2>
              <p className="text-sm text-content-muted">
                Camera và micro đã tắt. Các bản ghi local sẽ mất khi rời phòng; video và transcript
                đã lưu theo câu trả lời. Bạn có thể tải bản sao xuống.
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {questions.map((question, index) => {
                  const recording = recorder.recordings[question.id]
                  return recording ? (
                    <Stack key={question.id} gap="sm">
                      <p className="text-sm text-content-muted">{question.content}</p>
                      <RecordingPlayback recording={recording} questionNumber={index + 1} />
                    </Stack>
                  ) : null
                })}
              </div>
            </Stack>
          </Card>
        )}
      </Stack>
    )
  }

  if (!isStarted) {
    return (
      <Stack gap="lg">
        <PageHeader title={interview.title} description={interview.position} />
        <Card padding="xl">
          <Stack gap="lg">
            <h2 className="text-xl font-semibold text-content">Sẵn sàng phỏng vấn</h2>
            <p className="text-content-muted">
              Buổi này có {questions.length} câu hỏi. Trả lời lần lượt; nộp thành công mới mở câu
              tiếp theo. Đồng hồ bắt đầu khi bạn bấm bắt đầu.
            </p>
            <Button size="lg" onClick={handleStart} className="self-start">
              Bắt đầu phỏng vấn
            </Button>
          </Stack>
        </Card>
      </Stack>
    )
  }

  const isAnswered = answeredIds.has(currentQuestion.id)

  return (
    <Stack gap="lg">
      <PageHeader
        title={interview.title}
        description={interview.position}
        actions={
          <>
            <Badge tone={STATUS_TONE[interview.status]}>{STATUS_LABEL[interview.status]}</Badge>
            <Button
              variant="secondary"
              onClick={() => setIsFinishOpen(true)}
              disabled={!canSubmitSession}
            >
              Nộp session
            </Button>
          </>
        }
      />

      {!interview.cvPublicId && (
        <p role="alert" className="text-sm text-warning-700">
          Không tìm thấy CV gắn với session. Chưa thể nộp session để chấm điểm.
        </p>
      )}

      {/*
       * Đặt vị trí từng ô theo lưới thay vì xếp hai cột lồng nhau, để trên
       * điện thoại thứ tự đọc là: câu hỏi — đồng hồ — ô trả lời — danh sách.
       * Đồng hồ phải nằm ngay dưới câu hỏi chứ không tụt xuống dưới ô nhập.
       */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card padding="xl" className="lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-content-subtle">
              Câu {currentIndex + 1}/{questions.length}
            </span>
            <Badge tone={KIND_TONE[currentQuestion.kind]}>{KIND_LABEL[currentQuestion.kind]}</Badge>
            {isAnswered && <Badge tone="success">Đã lưu</Badge>}
          </div>

          <h2 className="mt-3 text-xl font-semibold text-content">{currentQuestion.content}</h2>

          <p className="mt-2 text-sm text-content-subtle">
            Thời gian gợi ý: {formatDuration(currentQuestion.suggestedSeconds)}
          </p>
        </Card>

        <Card className="lg:col-start-2 lg:row-start-1">
          <Stack gap="lg">
            <div>
              <p className="text-sm font-medium text-content-muted">Thời gian session</p>
              <p
                role="timer"
                aria-label="Thời gian session"
                className="mt-2 font-mono text-3xl font-semibold tabular-nums text-content"
              >
                {formatDuration(elapsed.sessionSeconds)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-content-muted">Thời gian câu hiện tại</p>
              <p
                role="timer"
                aria-label="Thời gian câu hiện tại"
                className="mt-2 font-mono text-3xl font-semibold tabular-nums text-content"
              >
                {formatDuration(elapsed.questionSeconds)}
              </p>
              <p className="mt-2 text-sm text-content-subtle">
                {isAnswered
                  ? 'Đã nộp câu cuối. Bạn có thể nộp session.'
                  : isSaving
                    ? saveStatus
                    : 'Tính từ khi mở câu đến lúc bấm nộp.'}
              </p>
            </div>
          </Stack>
        </Card>

        <Card className="lg:col-start-1 lg:row-start-2">
          <Textarea
            label="Transcript của bạn"
            maxLength={50000}
            hint="Có thể chỉnh transcript hoặc để rỗng. Video là bắt buộc. Ctrl + Enter để nộp."
            value={currentDraft}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            disabled={isBusy || isAnswered || answerSubmission.blocked}
            placeholder="Trình bày theo bố cục: bối cảnh — nhiệm vụ — hành động — kết quả."
            className="min-h-48"
          />

          {saveStatus && (
            <p role="status" className="mt-3 text-sm text-content-muted">
              {saveStatus}
            </p>
          )}
          {answerSubmission.error && (
            <p role="alert" className="mt-3 text-sm text-danger-700">
              {answerSubmission.error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-content-subtle">{currentDraft.length}/50.000 ký tự</span>

            <Stack direction="row" gap="sm" className="flex-wrap">
              <Button
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isBusy || isPermissionPending || isAnswered || answerSubmission.blocked}
              >
                {isAnswered
                  ? 'Đã nộp câu trả lời'
                  : saveStatus || 'Đã trả lời xong — Nộp câu trả lời'}
              </Button>
            </Stack>
          </div>
        </Card>

        <QuestionNavigator
          className="lg:col-start-2 lg:row-start-2"
          questions={questions}
          currentIndex={currentIndex}
          answeredIds={answeredIds}
        />

        <InterviewRecorder
          key={currentQuestion.id}
          recorder={recorder}
          questionId={currentQuestion.id}
          questionNumber={currentIndex + 1}
          disabled={isBusy || isAnswered || answerSubmission.blocked}
          className="min-w-0 lg:col-start-1 lg:row-start-3"
        />
      </div>

      <Modal
        open={isFinishOpen}
        dismissible={!isBusy}
        onClose={() => {
          if (!actionRef.current) setIsFinishOpen(false)
        }}
        title="Nộp session để chấm điểm"
        description="Tất cả câu trả lời đã lưu. Xác nhận nộp sẽ chốt thời gian session và bắt đầu chấm điểm; bạn không thể sửa câu trả lời sau đó."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFinishOpen(false)} disabled={isBusy}>
              Quay lại làm tiếp
            </Button>
            <Button onClick={handleFinish} disabled={!canSubmitSession} isLoading={isSubmitting}>
              Xác nhận nộp
            </Button>
          </>
        }
      />
    </Stack>
  )
}
