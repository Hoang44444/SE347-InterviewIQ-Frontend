import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CountdownTimer, QuestionNavigator } from '@/components/interview'
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
import { useCountdown } from '@/hooks/useCountdown'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { Answer, Interview, Question } from '@/types/interview'
import { formatDuration } from '@/utils/format'

export function InterviewRoomPage() {
  const { id = '' } = useParams<{ id: string }>()
  const toast = useToast()

  const [interview, setInterview] = useState<Interview | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  /** Đổi giá trị này để chạy lại effect tải dữ liệu (nút "Thử lại"). */
  const [reloadToken, setReloadToken] = useState(0)

  const [currentIndex, setCurrentIndex] = useState(0)
  /** Nội dung đang gõ, chưa gửi lên máy chủ. */
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  /** Câu trả lời đã gửi thành công, dùng để đánh dấu và tính tổng thời gian. */
  const [savedAnswers, setSavedAnswers] = useState<Record<string, Answer>>({})
  const [isSaving, setIsSaving] = useState(false)

  const [isFinishOpen, setIsFinishOpen] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  /**
   * Số giây còn lại của từng câu. Giữ trong ref vì chỉ cần đọc lúc chuyển câu;
   * để trong state sẽ làm cả trang render lại theo mỗi nhịp đồng hồ.
   */
  const remainingRef = useRef<Record<string, number>>({})

  useDocumentTitle(interview ? interview.title : 'Phòng phỏng vấn')

  const { secondsLeft, isRunning, start, pause, reset } = useCountdown(0, {
    onExpire: () =>
      toast.warning('Hết thời gian gợi ý', 'Vẫn trả lời tiếp được, chỉ là đã quá mức gợi ý.'),
  })

  useEffect(() => {
    let active = true

    Promise.all([interviewService.getById(id), interviewService.getQuestions(id)])
      .then(([detail, list]) => {
        if (!active) return

        setInterview(detail)
        setQuestions(list)
        setCurrentIndex(0)
        remainingRef.current = Object.fromEntries(
          list.map((question) => [question.id, question.suggestedSeconds]),
        )
        // Vào phòng là đồng hồ chạy ngay cho câu đầu tiên.
        reset(list[0]?.suggestedSeconds ?? 0, true)
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
  }, [id, reloadToken, reset])

  const currentQuestion = questions[currentIndex]
  const currentDraft = currentQuestion ? (drafts[currentQuestion.id] ?? '') : ''
  const answeredIds = useMemo(() => new Set(Object.keys(savedAnswers)), [savedAnswers])

  const hasUnsaved = questions.some(
    (question) => (drafts[question.id] ?? '').trim() !== '' && !answeredIds.has(question.id),
  )

  // Chặn đóng tab khi còn câu trả lời chưa gửi đi.
  useEffect(() => {
    if (!hasUnsaved || isFinished) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsaved, isFinished])

  const goTo = useCallback(
    (index: number) => {
      const target = questions[index]
      if (!target || index === currentIndex) return

      // Cất lại thời gian của câu đang mở trước khi nhảy sang câu khác.
      if (currentQuestion) remainingRef.current[currentQuestion.id] = secondsLeft

      setCurrentIndex(index)
      const remaining = remainingRef.current[target.id] ?? target.suggestedSeconds
      // Câu đã trả lời rồi thì mở ra đọc lại, không đếm giờ nữa.
      reset(remaining, !savedAnswers[target.id])
    },
    [currentIndex, currentQuestion, questions, reset, savedAnswers, secondsLeft],
  )

  function handleDraftChange(value: string) {
    if (!currentQuestion) return
    setDrafts((previous) => ({ ...previous, [currentQuestion.id]: value }))
  }

  async function handleSave() {
    if (!currentQuestion) return

    const content = currentDraft.trim()
    if (!content) {
      toast.warning('Chưa có nội dung', 'Nhập câu trả lời trước khi lưu.')
      return
    }

    pause()
    const answer: Answer = {
      questionId: currentQuestion.id,
      content,
      /*
       * Đồng hồ dừng hẳn ở 0 nên thời gian ghi nhận nhiều nhất bằng thời gian
       * gợi ý. Phần trả lời quá giờ không được tính thêm — lưu ý khi đối chiếu
       * số liệu với backend.
       */
      durationSeconds: Math.max(0, currentQuestion.suggestedSeconds - secondsLeft),
    }

    setIsSaving(true)
    try {
      await interviewService.submitAnswer(id, answer)
      setSavedAnswers((previous) => ({ ...previous, [currentQuestion.id]: answer }))
      toast.success('Đã lưu câu trả lời', `Câu ${currentIndex + 1}/${questions.length}`)

      if (currentIndex < questions.length - 1) goTo(currentIndex + 1)
    } catch (err) {
      toast.error('Không lưu được câu trả lời', (err as ApiError).message)
      // Lưu hỏng thì trả đồng hồ chạy tiếp để người dùng sửa rồi gửi lại.
      start()
    } finally {
      setIsSaving(false)
    }
  }

  /** Ctrl/Cmd + Enter để lưu nhanh, khỏi rời tay khỏi bàn phím. */
  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleSave()
    }
  }

  function handleFinish() {
    pause()
    setIsFinishOpen(false)
    setIsFinished(true)
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
          description="Quay lại danh sách và tạo buổi mới để hệ thống sinh bộ câu hỏi."
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
    const totalSpent = Object.values(savedAnswers).reduce(
      (sum, answer) => sum + answer.durationSeconds,
      0,
    )

    return (
      <Stack gap="lg">
        <PageHeader title="Đã kết thúc buổi phỏng vấn" description={interview.title} />
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
                {formatDuration(totalSpent)}
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
            <Button variant="secondary" onClick={() => setIsFinished(false)}>
              Xem lại câu trả lời
            </Button>
          </Stack>
        </Card>
      </Stack>
    )
  }

  const isAnswered = answeredIds.has(currentQuestion.id)
  const unansweredCount = questions.length - answeredIds.size

  return (
    <Stack gap="lg">
      <PageHeader
        title={interview.title}
        description={interview.position}
        actions={
          <>
            <Badge tone={STATUS_TONE[interview.status]}>{STATUS_LABEL[interview.status]}</Badge>
            <Button variant="secondary" onClick={() => setIsFinishOpen(true)}>
              Kết thúc buổi
            </Button>
          </>
        }
      />

      {/*
       * Đặt vị trí từng ô theo lưới thay vì xếp hai cột lồng nhau, để trên
       * điện thoại thứ tự đọc là: câu hỏi — đồng hồ — ô trả lời — danh sách.
       * Đồng hồ phải nằm ngay dưới câu hỏi chứ không tụt xuống dưới ô nhập.
       */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
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

        <CountdownTimer
          className="lg:col-start-2 lg:row-start-1"
          secondsLeft={secondsLeft}
          totalSeconds={currentQuestion.suggestedSeconds}
          isRunning={isRunning}
          onToggle={isRunning ? pause : start}
        />

        <Card className="lg:col-start-1 lg:row-start-2">
          <Textarea
            label="Câu trả lời của bạn"
            hint="Ctrl + Enter để lưu nhanh."
            value={currentDraft}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Trình bày theo bố cục: bối cảnh — nhiệm vụ — hành động — kết quả."
            className="min-h-48"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-content-subtle">{currentDraft.trim().length} ký tự</span>

            <Stack direction="row" gap="sm">
              <Button
                variant="secondary"
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                Câu trước
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                {isAnswered ? 'Lưu lại' : 'Lưu câu trả lời'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex === questions.length - 1}
              >
                Câu sau
              </Button>
            </Stack>
          </div>
        </Card>

        <QuestionNavigator
          className="lg:col-start-2 lg:row-start-2"
          questions={questions}
          currentIndex={currentIndex}
          answeredIds={answeredIds}
          onSelect={goTo}
        />
      </div>

      <Modal
        open={isFinishOpen}
        onClose={() => setIsFinishOpen(false)}
        title="Kết thúc buổi phỏng vấn"
        description={
          unansweredCount > 0
            ? `Còn ${unansweredCount} câu chưa lưu câu trả lời. Kết thúc bây giờ sẽ bỏ qua những câu đó.`
            : 'Bạn đã trả lời hết các câu hỏi.'
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFinishOpen(false)}>
              Quay lại làm tiếp
            </Button>
            <Button variant="danger" onClick={handleFinish}>
              Kết thúc
            </Button>
          </>
        }
      />
    </Stack>
  )
}
