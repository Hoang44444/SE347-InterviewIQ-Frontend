import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Badge, Button, Modal, Select, Spinner, Stack } from '@/components/ui'
import { BankPickerDialog } from '@/components/questionBank'
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
import {
  DIFFICULTY_GENERATE_OPTIONS,
  DIFFICULTY_REGENERATE_OPTIONS,
  DOMAIN_GENERATE_OPTIONS,
  DOMAIN_REGENERATE_OPTIONS,
} from '@/constants/questionBank'
import type {
  GenerateError,
  RegenerateFailure,
  ReplaceFromBankOutcome,
  SaveToBankOutcome,
} from '@/hooks/useSessionQuestions'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import type {
  GenerateQuestionsOptions,
  GeneratedQuestion,
  QuestionDifficulty,
  QuestionDomain,
  RegenerateQuestionOptions,
} from '@/types/interview'
import { cn } from '@/utils/cn'

const COUNT_OPTIONS = Array.from(
  { length: QUESTION_COUNT_MAX - QUESTION_COUNT_MIN + 1 },
  (_, index) => {
    const value = String(QUESTION_COUNT_MIN + index)
    return { value, label: value }
  },
)

/** Thông báo lỗi của toast cần đọc xong, nhất là câu hướng dẫn xoá bớt khi ngân hàng đầy. */
const ERROR_TOAST_MS = 8000

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

interface GenerationOptionsValue {
  count: number
  domain: QuestionDomain | ''
  difficulty: QuestionDifficulty | ''
}

/** Chỉ gửi trường người dùng đã chọn: "Hỗn hợp" và "Tăng dần" nghĩa là không gửi. */
function toGenerateOptions({
  count,
  domain,
  difficulty,
}: GenerationOptionsValue): GenerateQuestionsOptions {
  return {
    count,
    ...(domain ? { domain } : {}),
    ...(difficulty ? { difficulty } : {}),
  }
}

function GenerationOptions({
  value,
  onChange,
  disabled,
}: {
  value: GenerationOptionsValue
  onChange: (value: GenerationOptionsValue) => void
  disabled: boolean
}) {
  return (
    <>
      <div className="w-36">
        <Select
          id="question-count"
          label="Số câu hỏi"
          options={COUNT_OPTIONS}
          value={String(value.count)}
          onChange={(event) => onChange({ ...value, count: Number(event.target.value) })}
          disabled={disabled}
        />
      </div>
      <div className="w-40">
        <Select
          id="question-domain"
          label="Lĩnh vực"
          options={DOMAIN_GENERATE_OPTIONS}
          value={value.domain}
          onChange={(event) =>
            onChange({ ...value, domain: event.target.value as QuestionDomain | '' })
          }
          disabled={disabled}
        />
      </div>
      <div className="w-40">
        <Select
          id="question-difficulty"
          label="Độ khó"
          options={DIFFICULTY_GENERATE_OPTIONS}
          value={value.difficulty}
          onChange={(event) =>
            onChange({ ...value, difficulty: event.target.value as QuestionDifficulty | '' })
          }
          disabled={disabled}
        />
      </div>
    </>
  )
}

function ErrorNotice({
  title,
  error,
  note,
}: {
  title: string
  error: GenerateError
  note?: string
}) {
  const tone =
    error.kind === 'cv-not-parsed' || error.kind === 'not-created'
      ? 'bg-warning-50 text-warning-700'
      : 'bg-danger-50 text-danger-700'
  return (
    <div role="alert" className={cn('rounded-card px-4 py-3 text-sm', tone)}>
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5">
        {error.message}
        {note}
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

function GenerateErrorNotice({
  error,
  hasQuestions,
}: {
  error: GenerateError
  hasQuestions: boolean
}) {
  return (
    <ErrorNotice
      title={error.kind === 'cv-not-parsed' ? 'CV chưa được xử lý xong' : 'Chưa sinh được câu hỏi'}
      error={error}
      note={hasQuestions && error.kind === 'server' ? ' Bộ câu hỏi cũ vẫn được giữ nguyên.' : ''}
    />
  )
}

interface QuestionItemProps {
  question: GeneratedQuestion
  index: number
  /** Có thao tác ghi nào đang chạy: khoá mọi nút của câu. */
  isBusy: boolean
  isRegenerating: boolean
  failure: GenerateError | null
  onRegenerate: (questionPublicId: string, options: RegenerateQuestionOptions) => void
  onSave: (questionPublicId: string) => void
}

function QuestionItem({
  question,
  index,
  isBusy,
  isRegenerating,
  failure,
  onRegenerate,
  onSave,
}: QuestionItemProps) {
  // Mặc định giữ lĩnh vực và độ khó của câu cũ (không gửi trường nào).
  const [domain, setDomain] = useState<QuestionDomain | ''>('')
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | ''>('')
  const number = index + 1

  return (
    <li
      aria-busy={isRegenerating || undefined}
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
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-content-subtle uppercase">
          Câu {number}
        </p>
        <p className="font-medium wrap-anywhere text-content">{question.content}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={DOMAIN_TONE[question.domain]}>{DOMAIN_LABEL[question.domain]}</Badge>
          <Badge tone={DIFFICULTY_TONE[question.difficulty]}>
            {DIFFICULTY_LABEL[question.difficulty]}
          </Badge>
        </div>
        {isRegenerating && (
          <p role="status" className="text-sm text-content-muted">
            Đang sinh lại câu {number}, có thể mất tới khoảng {GENERATE_EXPECTED_SECONDS} giây.
          </p>
        )}
        {failure && <ErrorNotice title={`Chưa sinh lại được câu ${number}`} error={failure} />}
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <div className="w-36">
            <Select
              aria-label={`Lĩnh vực của câu ${number} sau khi sinh lại`}
              options={DOMAIN_REGENERATE_OPTIONS}
              value={domain}
              onChange={(event) => setDomain(event.target.value as QuestionDomain | '')}
              disabled={isBusy}
            />
          </div>
          <div className="w-36">
            <Select
              aria-label={`Độ khó của câu ${number} sau khi sinh lại`}
              options={DIFFICULTY_REGENERATE_OPTIONS}
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty | '')}
              disabled={isBusy}
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            aria-label={`Sinh lại câu ${number}`}
            isLoading={isRegenerating}
            disabled={isBusy}
            onClick={() =>
              onRegenerate(question.publicId, {
                ...(domain ? { domain } : {}),
                ...(difficulty ? { difficulty } : {}),
              })
            }
          >
            {isRegenerating ? 'Đang sinh…' : 'Sinh lại câu này'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            aria-label={`Lưu câu ${number} vào ngân hàng`}
            disabled={isBusy}
            onClick={() => onSave(question.publicId)}
          >
            Lưu vào ngân hàng
          </Button>
        </div>
      </div>
    </li>
  )
}

export interface QuestionGenerationPanelProps {
  questions: GeneratedQuestion[]
  isLoading: boolean
  loadError: string
  isGenerating: boolean
  generateError: GenerateError | null
  /** Câu đang được sinh lại, nếu có. */
  regeneratingId: string | null
  /** Lỗi sinh lại gần nhất, gắn với đúng câu bị lỗi. */
  regenerateFailure: RegenerateFailure | null
  isSaving: boolean
  isReplacing: boolean
  onGenerate: (options: GenerateQuestionsOptions) => void
  onRegenerate: (questionPublicId: string, options: RegenerateQuestionOptions) => void
  /** Bỏ trống ids là lưu cả bộ. `undefined` nghĩa là bị chặn vì đang có thao tác khác. */
  onSaveToBank: (questionPublicIds?: string[]) => Promise<SaveToBankOutcome | undefined>
  onReplaceFromBank: (itemPublicIds: string[]) => Promise<ReplaceFromBankOutcome | undefined>
  onReload: () => void
}

/**
 * Panel sinh, sinh lại, lưu và dùng câu từ ngân hàng cho bộ câu hỏi của phiên
 * CREATED. Trạng thái nằm ở `useSessionQuestions`; panel chỉ giữ lựa chọn trên
 * form và hiện toast kết quả.
 */
export function QuestionGenerationPanel({
  questions,
  isLoading,
  loadError,
  isGenerating,
  generateError,
  regeneratingId,
  regenerateFailure,
  isSaving,
  isReplacing,
  onGenerate,
  onRegenerate,
  onSaveToBank,
  onReplaceFromBank,
  onReload,
}: QuestionGenerationPanelProps) {
  const toast = useToast()
  const [options, setOptions] = useState<GenerationOptionsValue>({
    count: QUESTION_COUNT_DEFAULT,
    domain: '',
    difficulty: '',
  })
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const hasQuestions = questions.length > 0
  const isBusy = isGenerating || regeneratingId !== null || isSaving || isReplacing

  function confirmRegenerate() {
    setIsConfirmOpen(false)
    onGenerate(toGenerateOptions(options))
  }

  async function save(questionPublicIds?: string[]) {
    const outcome = await onSaveToBank(questionPublicIds)
    if (!outcome) return
    if (!outcome.ok) {
      toast.show({
        title: 'Chưa lưu được vào ngân hàng',
        description: outcome.error.message,
        tone: 'error',
        duration: ERROR_TOAST_MS,
      })
      return
    }
    const { savedCount, skippedCount } = outcome.result
    const detail = `Đã lưu ${savedCount} câu, bỏ qua ${skippedCount} câu đã có.`
    if (savedCount > 0) toast.success('Đã lưu vào ngân hàng', detail)
    else toast.info('Không có câu mới để lưu', detail)
  }

  async function replaceFromBank(itemPublicIds: string[]) {
    const outcome = await onReplaceFromBank(itemPublicIds)
    if (outcome?.ok) {
      toast.success('Đã dùng câu từ ngân hàng', `Bộ câu hỏi mới có ${itemPublicIds.length} câu.`)
    }
    return outcome
  }

  const picker = (
    <BankPickerDialog
      open={isPickerOpen}
      onClose={() => setIsPickerOpen(false)}
      currentCount={questions.length}
      isReplacing={isReplacing}
      onConfirm={replaceFromBank}
    />
  )

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
        <p className="text-sm text-content-muted">
          AI sẽ sinh câu hỏi dựa trên CV và JD của bạn, hoặc bạn có thể dùng câu đã lưu trong ngân
          hàng.
        </p>
        {generateError && (
          <div className="w-full max-w-xl text-left">
            <GenerateErrorNotice error={generateError} hasQuestions={false} />
          </div>
        )}
        <div className="flex flex-wrap items-end justify-center gap-3">
          <GenerationOptions value={options} onChange={setOptions} disabled={isBusy} />
          <Button onClick={() => onGenerate(toGenerateOptions(options))} disabled={isBusy}>
            {generateError && generateError.kind !== 'cv-not-parsed' ? 'Thử lại' : 'Sinh câu hỏi'}
          </Button>
          <Button variant="secondary" onClick={() => setIsPickerOpen(true)} disabled={isBusy}>
            Dùng câu từ ngân hàng
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
            <GenerationOptions value={options} onChange={setOptions} disabled={isBusy} />
            <Button
              variant="secondary"
              onClick={() => setIsConfirmOpen(true)}
              isLoading={isGenerating}
              disabled={isBusy}
            >
              {isGenerating ? 'Đang sinh…' : 'Sinh lại'}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => setIsPickerOpen(true)} disabled={isBusy}>
            Dùng câu từ ngân hàng
          </Button>
          <Button
            variant="secondary"
            onClick={() => void save()}
            isLoading={isSaving}
            disabled={isBusy}
          >
            Lưu cả bộ vào ngân hàng
          </Button>
        </div>
        {isGenerating && (
          <p role="status" className="text-sm text-content-muted">
            Đang sinh bộ câu hỏi mới, có thể mất tới khoảng {GENERATE_EXPECTED_SECONDS} giây.
          </p>
        )}
        {isReplacing && (
          <p role="status" className="text-sm text-content-muted">
            Đang thay bộ câu hỏi bằng các câu từ ngân hàng…
          </p>
        )}
        {generateError && <GenerateErrorNotice error={generateError} hasQuestions />}
        <ol className="flex flex-col gap-3">
          {questions.map((question, index) => (
            <QuestionItem
              // Đổi nội dung thì dựng lại, để hai ô chọn của câu trở về "Giữ nguyên".
              key={`${question.publicId}:${question.content}`}
              question={question}
              index={index}
              isBusy={isBusy}
              isRegenerating={regeneratingId === question.publicId}
              failure={
                regenerateFailure?.questionPublicId === question.publicId
                  ? regenerateFailure.error
                  : null
              }
              onRegenerate={onRegenerate}
              onSave={(questionPublicId) => void save([questionPublicId])}
            />
          ))}
        </ol>
      </Stack>
    )
  }

  const domainText = options.domain ? DOMAIN_LABEL[options.domain] : 'hỗn hợp lĩnh vực'
  const difficultyText = options.difficulty
    ? DIFFICULTY_LABEL[options.difficulty]
    : 'độ khó tăng dần'

  return (
    <section aria-labelledby="question-panel-title" className="flex flex-col gap-4">
      <h2 id="question-panel-title" className="text-xl font-semibold text-content">
        Bộ câu hỏi phỏng vấn
      </h2>
      {body}
      {picker}
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
          Sẽ sinh <strong className="text-content">{options.count} câu hỏi</strong> ({domainText},{' '}
          {difficultyText}). Quá trình có thể mất tới khoảng {GENERATE_EXPECTED_SECONDS} giây.
        </p>
      </Modal>
    </section>
  )
}
