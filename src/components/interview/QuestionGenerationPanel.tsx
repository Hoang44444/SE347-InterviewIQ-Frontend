import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Badge, Button, Modal, Select, Spinner, Stack } from '@/components/ui'
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_TONE,
  DOMAIN_LABEL,
  DOMAIN_TONE,
  GENERATE_EXPECTED_SECONDS,
  QUESTION_COUNT_DEFAULT,
  QUESTION_COUNT_MAX,
  QUESTION_COUNT_MIN,
} from '@/constants/interview'
import type { GenerateError } from '@/hooks/useSessionQuestions'
import { ROUTES } from '@/routes/paths'
import type { GeneratedQuestion, QuestionDomain } from '@/types/interview'
import { cn } from '@/utils/cn'

const COUNT_OPTIONS = Array.from(
  { length: QUESTION_COUNT_MAX - QUESTION_COUNT_MIN + 1 },
  (_, index) => {
    const value = String(QUESTION_COUNT_MIN + index)
    return { value, label: value }
  },
)

const DOMAIN_TILE_CLASS: Record<QuestionDomain, string> = {
  TECHNICAL: 'bg-info-50 text-info-700',
  BEHAVIORAL: 'bg-brand-50 text-brand-700',
  SITUATIONAL: 'bg-warning-50 text-warning-700',
}

function Icon({ children, size = 'size-6' }: { children: ReactNode; size?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={size}
    >
      {children}
    </svg>
  )
}

const DOMAIN_ICON: Record<QuestionDomain, ReactNode> = {
  TECHNICAL: (
    <Icon>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </Icon>
  ),
  BEHAVIORAL: (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  ),
  SITUATIONAL: (
    <Icon>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </Icon>
  ),
}

function HeroIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-18 items-center justify-center rounded-full bg-surface text-brand-600 shadow-card">
      {children}
    </span>
  )
}

function CountSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: number
  onChange: (value: number) => void
  disabled: boolean
}) {
  return (
    <div className="w-44">
      <Select
        id={id}
        label="Số câu hỏi"
        options={COUNT_OPTIONS}
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
      />
    </div>
  )
}

function GenerateErrorNotice({
  error,
  hasQuestions,
}: {
  error: GenerateError
  hasQuestions: boolean
}) {
  const tone =
    error.kind === 'cv-not-parsed' || error.kind === 'not-created'
      ? 'bg-warning-50 text-warning-700'
      : 'bg-danger-50 text-danger-700'
  return (
    <div role="alert" className={cn('rounded-card px-4 py-3 text-sm', tone)}>
      <p className="font-semibold">
        {error.kind === 'cv-not-parsed' ? 'CV chưa được xử lý xong' : 'Chưa sinh được câu hỏi'}
      </p>
      <p className="mt-0.5">
        {error.message}
        {hasQuestions && error.kind === 'server' && ' Bộ câu hỏi cũ vẫn được giữ nguyên.'}
      </p>
      {error.kind === 'cv-not-parsed' && (
        <Link to={ROUTES.cvs} className="mt-2 inline-block">
          <Button variant="secondary" size="sm">
            Mở trang CV
          </Button>
        </Link>
      )}
    </div>
  )
}

function QuestionList({ questions }: { questions: GeneratedQuestion[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {questions.map((question, index) => (
        <li
          key={question.publicId}
          className="flex items-start gap-4 rounded-card border border-border bg-surface p-4 shadow-card"
        >
          <span
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-card',
              DOMAIN_TILE_CLASS[question.domain],
            )}
          >
            {DOMAIN_ICON[question.domain]}
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-xs font-semibold tracking-wide text-content-subtle uppercase">
              Câu {index + 1}
            </p>
            <p className="font-medium wrap-anywhere text-content">{question.content}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={DOMAIN_TONE[question.domain]}>{DOMAIN_LABEL[question.domain]}</Badge>
              <Badge tone={DIFFICULTY_TONE[question.difficulty]}>
                {DIFFICULTY_LABEL[question.difficulty]}
              </Badge>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export interface QuestionGenerationPanelProps {
  questions: GeneratedQuestion[]
  isLoading: boolean
  loadError: string
  isGenerating: boolean
  generateError: GenerateError | null
  onGenerate: (count: number) => void
  onReload: () => void
}

/** Panel sinh và xem bộ câu hỏi của phiên CREATED. Trạng thái nằm ở `useSessionQuestions`. */
export function QuestionGenerationPanel({
  questions,
  isLoading,
  loadError,
  isGenerating,
  generateError,
  onGenerate,
  onReload,
}: QuestionGenerationPanelProps) {
  const [count, setCount] = useState(QUESTION_COUNT_DEFAULT)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const hasQuestions = questions.length > 0

  function confirmRegenerate() {
    setIsConfirmOpen(false)
    onGenerate(count)
  }

  let body: ReactNode
  if (isLoading && !isGenerating) {
    body = (
      <div role="status" className="flex flex-col items-center gap-3 py-6">
        <Spinner size="lg" label="Đang tải câu hỏi" />
        <p className="text-sm text-content-muted">Đang tải bộ câu hỏi…</p>
      </div>
    )
  } else if (loadError && !hasQuestions) {
    body = (
      <Stack gap="sm">
        <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <span className="block font-semibold">Chưa tải được bộ câu hỏi</span>
          {loadError}
        </p>
        <Button variant="secondary" className="self-start" onClick={onReload}>
          Tải lại
        </Button>
      </Stack>
    )
  } else if (isGenerating && !hasQuestions) {
    body = (
      <div
        aria-busy="true"
        className="flex flex-col items-center gap-3 rounded-card border border-brand-100 bg-brand-50 px-6 py-8 text-center"
      >
        <HeroIcon>
          <Spinner size="lg" label="Đang sinh câu hỏi" />
        </HeroIcon>
        <h3 className="text-xl font-bold text-content">Đang sinh câu hỏi…</h3>
        <p role="status" className="max-w-md text-sm text-content-muted">
          Quá trình có thể mất tới khoảng {GENERATE_EXPECTED_SECONDS} giây. Vui lòng không đóng hoặc
          tải lại trang.
        </p>
      </div>
    )
  } else if (!hasQuestions) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-card border border-brand-100 bg-brand-50 px-6 py-8 text-center">
        <HeroIcon>
          <Icon size="size-8">
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
            <path d="M19 16v4M17 18h4" />
          </Icon>
        </HeroIcon>
        <h3 className="text-xl font-bold text-content">Chưa có câu hỏi nào</h3>
        <p className="text-sm text-content-muted">AI sẽ sinh câu hỏi dựa trên CV và JD của bạn.</p>
        {generateError && (
          <div className="w-full max-w-xl text-left">
            <GenerateErrorNotice error={generateError} hasQuestions={false} />
          </div>
        )}
        <div className="flex flex-wrap items-end justify-center gap-3">
          <CountSelect id="question-count" value={count} onChange={setCount} disabled={false} />
          <Button onClick={() => onGenerate(count)}>
            {generateError && generateError.kind !== 'cv-not-parsed' ? 'Thử lại' : 'Sinh câu hỏi'}
          </Button>
        </div>
      </div>
    )
  } else {
    body = (
      <Stack gap="md">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-content-muted">{questions.length} câu hỏi</p>
          <div className="flex flex-wrap items-end gap-3">
            <CountSelect
              id="question-count"
              value={count}
              onChange={setCount}
              disabled={isGenerating}
            />
            <Button
              variant="secondary"
              onClick={() => setIsConfirmOpen(true)}
              isLoading={isGenerating}
            >
              {isGenerating ? 'Đang sinh…' : 'Sinh lại'}
            </Button>
          </div>
        </div>
        {isGenerating && (
          <p role="status" className="text-sm text-content-muted">
            Đang sinh bộ câu hỏi mới, có thể mất tới khoảng {GENERATE_EXPECTED_SECONDS} giây.
          </p>
        )}
        {generateError && <GenerateErrorNotice error={generateError} hasQuestions />}
        <QuestionList questions={questions} />
      </Stack>
    )
  }

  return (
    <section aria-labelledby="question-panel-title" className="flex flex-col gap-4">
      <h2 id="question-panel-title" className="text-xl font-semibold text-content">
        Bộ câu hỏi phỏng vấn
      </h2>
      {body}
      <Modal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Sinh lại bộ câu hỏi?"
        description={`Thao tác này thay thế toàn bộ ${questions.length} câu hỏi hiện tại bằng bộ mới. Bộ cũ không khôi phục được.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsConfirmOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={confirmRegenerate}>Sinh lại</Button>
          </>
        }
      >
        <p className="text-sm text-content-muted">
          Sẽ sinh <strong className="text-content">{count} câu hỏi</strong>. Quá trình có thể mất
          tới khoảng {GENERATE_EXPECTED_SECONDS} giây.
        </p>
      </Modal>
    </section>
  )
}
