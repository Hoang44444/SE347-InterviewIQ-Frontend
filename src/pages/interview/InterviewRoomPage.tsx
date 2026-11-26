import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { AiMascot, type AiMascotMood } from '@/components/brand/AiMascot'
import { InterviewSessionRoom } from '@/components/interview/InterviewSessionRoom'
import {
  IntegrityStatus,
  InterviewRecorder,
  LeaveRoomGuard,
  QuestionPanel,
  QuestionProgress,
  RecordingPlayback,
  SpeechFeedback,
} from '@/components/interview'
import {
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  Stack,
  Textarea,
} from '@/components/ui'
import { useAnswerTranscription } from '@/hooks/useAnswerTranscription'
import { useInterviewClock } from '@/hooks/useInterviewClock'
import { useAnswerSubmission } from '@/hooks/useAnswerSubmission'
import { useSessionSubmission } from '@/hooks/useSessionSubmission'
import { useScoringJob } from '@/hooks/useScoringJob'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useEmotionCollector } from '@/hooks/useEmotionCollector'
import { useIntegrityMonitor } from '@/hooks/useIntegrityMonitor'
import { useInterviewRecorder } from '@/hooks/useInterviewRecorder'
import { useToast } from '@/hooks/useToast'
import { roomClockKey } from '@/constants/interview'
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
import { isSessionId } from '@/utils/sessionId'
import { storage } from '@/utils/storage'

/* Lưu ý ở phòng chờ: không phải các bước tuần tự nên dùng dấu tích, không đánh số. */
const LOBBY_NOTES = [
  'Mỗi câu ghi một video. Nộp xong câu này mới mở câu tiếp theo.',
  'Đồng hồ chỉ bắt đầu chạy khi bạn bấm Bắt đầu phỏng vấn.',
  'Bản ghi chưa nộp sẽ mất nếu tải lại hoặc rời trang.',
  'Khi đang ghi, trình duyệt chép lời bạn nói vào ô trả lời. Một số trình duyệt như Chrome gửi âm thanh tới máy chủ của hãng để làm việc này.',
  'Trong lúc phỏng vấn, hệ thống ghi nhận rời tab, thoát toàn màn hình và phân tích hình camera ngay trên máy bạn (không có mặt, nhiều người, nhìn đi chỗ khác) để người xem xét. Hình không bị gửi đi để phân tích; chỉ loại và thời điểm cảnh báo được lưu vào lịch sử của bạn.',
  'Máy bạn cũng tính một bản tóm tắt nét mặt cho mỗi câu (tỉ lệ thời gian tích cực, bình thản, ngạc nhiên và mức nhìn đi chỗ khác) gửi kèm câu trả lời để hỗ trợ chấm điểm sự tự tin. Chỉ có các con số, không có hình ảnh; đây chỉ là tín hiệu tham khảo.',
]

/**
 * Mốc đồng hồ để làm tiếp một phiên: ưu tiên mốc đã nhớ trên máy này. Máy khác (hoặc
 * đã xoá storage) mà phiên có câu đã nộp thì dùng mốc của server.
 */
function rememberedStart(id: string, { startedAt }: Interview, hasAnswers: boolean) {
  if (!startedAt) return null
  const stored = storage.get<unknown>(roomClockKey(id))
  if (typeof stored === 'number' && stored > 0 && stored <= Date.now()) return stored
  const server = Date.parse(startedAt)
  return hasAnswers && Number.isFinite(server) ? Math.min(server, Date.now()) : null
}

export function InterviewRoomPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { state } = useLocation()
  const session = (state as InterviewRoomLocationState | null)?.session
  return (
    <InterviewSessionRoom
      key={id}
      id={id}
      knownSession={session}
      liveRoom={<InterviewRoom id={id} />}
    />
  )
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
  const { savedAnswers, restore: restoreAnswers } = answerSubmission
  /** Mốc đồng hồ của lần vào phòng trước; null khi đây là lần đầu. */
  const [resumeFrom, setResumeFrom] = useState<number | null>(null)
  const [answerDurations, setAnswerDurations] = useState<Record<string, number>>({})
  const [isFinalizing, setIsFinalizing] = useState(false)
  // Ref khoá ngay cả hai click/Ctrl+Enter trước khi React kịp render disabled.
  const actionRef = useRef(false)
  const activeRef = useRef(false)

  const [isFinishOpen, setIsFinishOpen] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  /** Nhân vật AI cười và vẫy tay một lúc sau mỗi câu nộp thành công. */
  const [isCelebrating, setIsCelebrating] = useState(false)
  const celebrateTimerRef = useRef(0)
  const sideRef = useRef<HTMLDivElement>(null)
  const { clock, elapsed } = useInterviewClock(isStarted)
  const sessionSubmission = useSessionSubmission(id, service, clock)
  const { timing: sessionTiming, submission, isSubmitting } = sessionSubmission
  const isFinished = sessionTiming !== null
  const scoring = useScoringJob(submission?.jobId ?? null, service)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
      window.clearTimeout(celebrateTimerRef.current)
    }
  }, [])

  // Nút Bắt đầu vừa bấm đã biến mất: chuyển focus sang câu hỏi để không rơi về đầu trang.
  useEffect(() => {
    if (isStarted) sideRef.current?.focus()
  }, [isStarted])

  useDocumentTitle(interview ? interview.title : 'Phòng phỏng vấn')

  useEffect(() => {
    let active = true

    Promise.all([service.getById(id), service.getQuestions(id)])
      .then(([detail, list]) => {
        if (!active) return

        const restored = detail.savedAnswers ?? []
        const answered = new Set(restored.map((answer) => answer.questionPublicId))
        const firstOpen = list.findIndex((question) => !answered.has(question.id))

        setInterview(detail)
        setQuestions(list)
        setCurrentIndex(firstOpen === -1 ? Math.max(0, list.length - 1) : firstOpen)
        restoreAnswers(restored)
        setDrafts((previous) => ({
          ...Object.fromEntries(
            restored.map((answer) => [answer.questionPublicId, answer.transcript]),
          ),
          ...previous,
        }))
        setResumeFrom(rememberedStart(id, detail, restored.length > 0))
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
  }, [id, reloadToken, service, restoreAnswers])

  // Nộp xong thì phiên đã đóng, không còn gì để vào lại.
  useEffect(() => {
    if (submission) storage.remove(roomClockKey(id))
  }, [id, submission])

  const currentQuestion = questions[currentIndex]
  const currentDraft = currentQuestion ? (drafts[currentQuestion.id] ?? '') : ''
  // Dùng chung detector của giám sát gian lận: không nạp model nhận diện mặt lần hai.
  const emotion = useEmotionCollector({
    questionId: currentQuestion?.id,
    recording: recorder.status === 'recording',
  })
  const integrity = useIntegrityMonitor({
    enabled: isStarted && !isFinished,
    stream: recorder.stream,
    questionId: currentQuestion?.id,
    sessionId: id,
    cheatLogs: service.cheatLogs,
    onObservation: emotion.onObservation,
  })
  const violationCount = integrity.summary?.totalCount ?? integrity.events.length
  const transcription = useAnswerTranscription({
    recorderStatus: recorder.status,
    recordings: recorder.recordings,
    questionId: currentQuestion?.id,
    text: currentDraft,
    onChange: (questionId, text) => setDrafts((previous) => ({ ...previous, [questionId]: text })),
  })
  const answeredIds = useMemo(() => new Set(Object.keys(savedAnswers)), [savedAnswers])
  const answeredCount = questions.filter((question) => answeredIds.has(question.id)).length
  const isResuming = resumeFrom !== null || answeredCount > 0

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
    // Đồng hồ chỉ chạy khi camera và micro đã sẵn sàng ở phòng chờ.
    if (!currentQuestion || isStarted || actionRef.current || recorder.status !== 'ready') return
    const startedAt = resumeFrom ?? Date.now()
    clock.start(currentQuestion.id, startedAt)
    if (interview?.startedAt) storage.set(roomClockKey(id), startedAt)
    setIsStarted(true)
    // Toàn màn hình giúp phát hiện việc rời phòng; từ chối cũng không sao.
    void document.documentElement.requestFullscreen?.().catch(() => {})
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
      // Bài nộp lấy đúng chữ đang hiện trong ô; lời đến muộn không được sửa nó nữa.
      transcription.release()
      setIsFinalizing(false)
      const answer = await answerSubmission.save(
        currentQuestion.id,
        currentDraft,
        finalized ?? recorder.recordings[currentQuestion.id],
        // Tính sau khi đã dừng ghi để gồm đủ mẫu; null khi không đủ dữ liệu đáng tin.
        emotion.summarize(currentQuestion.id),
      )
      if (!activeRef.current || !answer) return
      setAnswerDurations((previous) => ({ ...previous, [currentQuestion.id]: answerSeconds }))
      toast.success('Đã lưu câu trả lời', `Câu ${currentIndex + 1}/${questions.length}`)
      setIsCelebrating(true)
      window.clearTimeout(celebrateTimerRef.current)
      celebrateTimerRef.current = window.setTimeout(() => {
        if (activeRef.current) setIsCelebrating(false)
      }, 2500)
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

  const leaveGuard = <LeaveRoomGuard when={shouldWarnOnLeave} />

  if (isFinished) {
    return (
      <Stack gap="lg">
        {leaveGuard}
        <PageHeader
          title={
            !submission
              ? 'Bài phỏng vấn đã chốt để nộp'
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
            {isSubmitting && <p role="status">Đang nộp bài phỏng vấn</p>}
            {sessionSubmission.error && (
              <p role="alert" className="text-sm text-danger-700">
                {sessionSubmission.error}
              </p>
            )}
            {sessionSubmission.canRetry && (
              <>
                <p className="text-sm text-content-muted">
                  Bài có thể đã được lưu trên máy chủ. Thời gian và câu trả lời đã khóa; thử nộp lại
                  để bắt đầu chấm điểm.
                </p>
                <Button onClick={handleFinish} isLoading={isSubmitting} className="self-start">
                  Thử nộp bài lại
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
                {scoring.job?.status === 'COMPLETED' ? (
                  isSessionId(id) ? (
                    <Stack gap="sm">
                      <p className="text-sm text-content-subtle">
                        Chấm điểm đã hoàn tất. Xem bảng điểm, nhận xét chi tiết và biểu đồ biểu cảm.
                      </p>
                      <Link
                        to={ROUTES.historyDetail(id)}
                        className="inline-flex h-10 items-center justify-center self-start rounded-control bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                      >
                        Xem kết quả chi tiết
                      </Link>
                    </Stack>
                  ) : (
                    <p className="text-sm text-content-subtle">
                      Phiên demo đã chấm xong. Dữ liệu mẫu chỉ giữ tạm trong phòng này và không lưu
                      vào lịch sử.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-content-subtle">
                    Theo dõi tiến độ chấm điểm cho bài đã nộp.
                  </p>
                )}
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
              <dd className="mt-1 text-2xl font-semibold text-content tabular-nums">
                {formatDuration(sessionTiming?.durationSeconds ?? 0)}
              </dd>
            </div>
            {interview.position && (
              <div>
                <dt className="text-sm text-content-subtle">Vị trí</dt>
                <dd className="mt-1 text-2xl font-semibold text-content">{interview.position}</dd>
              </div>
            )}
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
                  {answerDurations[question.id] !== undefined && (
                    <p className="text-sm text-content-subtle">
                      Thời gian trả lời: {formatDuration(answerDurations[question.id])}
                    </p>
                  )}
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

  const suggestedTotal = questions.reduce(
    (sum, question) => sum + (question.suggestedSeconds ?? 0),
    0,
  )
  const totalMinutes = suggestedTotal > 0 ? Math.max(1, Math.round(suggestedTotal / 60)) : 0
  const isReady = recorder.status === 'ready'
  const isAnswered = answeredIds.has(currentQuestion.id)
  const isLastAnswered = isAnswered && currentIndex === questions.length - 1
  const hasVideo = !!recorder.recordings[currentQuestion.id] || recorder.status === 'recording'
  const mood: AiMascotMood = isSaving
    ? 'thinking'
    : recorder.status === 'recording'
      ? 'listening'
      : // Chỉ vui một lúc sau khi nộp; vẫy tay mãi thì thành chuyển động lặp gây phân tâm.
        isCelebrating
        ? 'happy'
        : 'idle'
  const caption = isLastAnswered
    ? 'Xong hết rồi! Bấm Nộp bài phỏng vấn để chấm điểm.'
    : isSaving
      ? 'Đang xem câu trả lời của bạn…'
      : recorder.status === 'recording'
        ? 'Mình đang nghe đây.'
        : isCelebrating
          ? 'Tốt lắm! Sang câu tiếp theo nhé.'
          : 'Đọc kỹ câu hỏi, bấm Bắt đầu ghi khi bạn sẵn sàng.'

  return (
    <Stack gap="lg">
      {leaveGuard}
      <PageHeader
        title={interview.title}
        description={interview.position}
        actions={
          isStarted ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <QuestionProgress
                questions={questions}
                currentIndex={currentIndex}
                answeredIds={answeredIds}
              />
              <p
                role="timer"
                aria-label="Tổng thời gian"
                className="text-lg font-semibold text-content tabular-nums"
              >
                {formatDuration(elapsed.sessionSeconds)}
              </p>
              <Button onClick={() => setIsFinishOpen(true)} disabled={!canSubmitSession}>
                Nộp bài phỏng vấn
              </Button>
            </div>
          ) : undefined
        }
      />

      {isStarted && !interview.cvPublicId && (
        <p
          role="alert"
          className="rounded-control bg-warning-50 px-4 py-3 text-sm text-warning-700"
        >
          Không tìm thấy CV gắn với buổi phỏng vấn. Chưa thể nộp bài để chấm điểm.
        </p>
      )}

      {/*
       * Phòng chờ và phòng phỏng vấn dùng chung một lưới: camera luôn ở cột trái
       * và không bị gắn lại khi bắt đầu hay chuyển câu, chỉ cột phải đổi nội dung.
       * Trên điện thoại thứ tự đọc là: câu hỏi (hoặc phòng chờ), camera, ghi chú.
       */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr]">
        <div
          ref={sideRef}
          tabIndex={-1}
          // key đổi khi bắt đầu để cột phải hiện lên lại, báo rằng nội dung đã đổi.
          key={isStarted ? 'room' : 'lobby'}
          className="animate-rise-in outline-none lg:col-start-2 lg:row-start-1"
        >
          {isStarted ? (
            <QuestionPanel
              question={currentQuestion}
              index={currentIndex}
              total={questions.length}
              questionSeconds={elapsed.questionSeconds}
              isAnswered={isAnswered}
              mood={mood}
              caption={caption}
            />
          ) : (
            <Card padding="lg">
              <Stack gap="lg">
                <div className="flex items-center gap-4">
                  <AiMascot className="w-20 shrink-0" />
                  <div>
                    <h2 className="text-xl font-semibold text-content">Phòng chờ</h2>
                    <p className="mt-1 text-sm text-content-muted">
                      {questions.length} câu hỏi
                      {totalMinutes > 0 && `, khoảng ${totalMinutes} phút`}
                    </p>
                  </div>
                </div>

                {isResuming && (
                  <p className="rounded-control bg-brand-50 px-4 py-3 text-sm text-brand-700">
                    {answeredCount === questions.length
                      ? `Đã nộp đủ ${questions.length} câu. Bấm Tiếp tục để nộp bài phỏng vấn.`
                      : `Bạn đã nộp ${answeredCount}/${questions.length} câu và sẽ làm tiếp từ câu ${currentIndex + 1}.`}{' '}
                    Đồng hồ tính cả thời gian bạn rời phòng.
                  </p>
                )}

                <ul className="flex flex-col gap-3 text-sm text-content-muted">
                  {LOBBY_NOTES.map((note) => (
                    <li key={note} className="flex gap-2">
                      <svg
                        aria-hidden
                        viewBox="0 0 20 20"
                        className="mt-0.5 size-4 shrink-0 fill-none stroke-brand-600 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]"
                      >
                        <path d="M4 10.5l4 4 8-9" />
                      </svg>
                      {note}
                    </li>
                  ))}
                </ul>

                <div>
                  <Button size="lg" fullWidth onClick={handleStart} disabled={!isReady}>
                    {isResuming ? 'Tiếp tục phỏng vấn' : 'Bắt đầu phỏng vấn'}
                  </Button>
                  {!isReady && (
                    <p className="mt-2 text-sm text-content-subtle">
                      Bật camera và micro để bắt đầu.
                    </p>
                  )}
                </div>
              </Stack>
            </Card>
          )}
        </div>

        <InterviewRecorder
          recorder={recorder}
          phase={isStarted ? 'room' : 'lobby'}
          questionId={currentQuestion.id}
          questionNumber={currentIndex + 1}
          // Ở phòng chờ câu đang mở có thể đã nộp (vào lại phòng) mà vẫn cần bật camera.
          disabled={isBusy || (isStarted && isAnswered) || answerSubmission.blocked}
          className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1"
          statusSlot={
            isStarted && !isFinished ? (
              <Stack gap="sm">
                {!isAnswered && (
                  <SpeechFeedback
                    status={transcription.status}
                    error={transcription.error}
                    pace={transcription.pace}
                    wpm={transcription.wpm}
                  />
                )}
                <IntegrityStatus
                  activeTypes={integrity.activeTypes}
                  violationCount={violationCount}
                  detectorState={integrity.detectorState}
                />
              </Stack>
            ) : undefined
          }
          actions={
            isStarted ? (
              <Button
                size="lg"
                variant={hasVideo ? 'primary' : 'secondary'}
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isBusy || isPermissionPending || isAnswered || answerSubmission.blocked}
              >
                {isAnswered ? 'Đã nộp câu trả lời' : saveStatus || 'Nộp câu trả lời'}
              </Button>
            ) : undefined
          }
        />

        {isStarted && (
          <Card padding="lg" className="animate-rise-in stagger-1 lg:col-start-2 lg:row-start-2">
            <Textarea
              label="Ghi chú câu trả lời"
              maxLength={50000}
              hint={
                transcription.isListening
                  ? 'Đang chép lời bạn nói. Dừng ghi để sửa nội dung. Ctrl + Enter để nộp.'
                  : 'Không bắt buộc. Nội dung này gửi kèm video và dùng để chấm điểm. Ctrl + Enter để nộp.'
              }
              readOnly={transcription.isListening}
              value={currentDraft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              disabled={isBusy || isAnswered || answerSubmission.blocked}
              placeholder="Bối cảnh, nhiệm vụ, hành động, kết quả"
              className="min-h-32"
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
            <p className="mt-3 text-xs text-content-subtle tabular-nums">
              {currentDraft.length}/50.000 ký tự
            </p>
          </Card>
        )}
      </div>

      <Modal
        open={isFinishOpen}
        dismissible={!isBusy}
        onClose={() => {
          if (!actionRef.current) setIsFinishOpen(false)
        }}
        title="Nộp bài phỏng vấn để chấm điểm"
        description="Bạn đã nộp đủ câu trả lời. Sau khi nộp, thời gian được chốt, bài bắt đầu được chấm điểm và không sửa được câu trả lời nữa."
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
