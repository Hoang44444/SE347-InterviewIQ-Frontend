import { useState } from 'react'

import { Badge, Button, Select, Spinner, Stack } from '@/components/ui'
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_TONE,
  DOMAIN_LABEL,
  DOMAIN_TONE,
  QUESTION_COUNT_DEFAULT,
  QUESTION_COUNT_OPTIONS,
} from '@/constants/interview'
import { RETRYABLE_GENERATE_ERRORS, type useSessionQuestions } from '@/hooks/useSessionQuestions'
import type { InterviewSessionStatus } from '@/types/interview'

export interface SessionQuestionsPanelProps {
  status: InterviewSessionStatus
  questions: ReturnType<typeof useSessionQuestions>
  /** Khoá thêm từ bên ngoài, ví dụ đang bắt đầu phiên. */
  disabled?: boolean
}

/** Danh sách câu hỏi của phiên, kèm nút sinh/sinh lại khi phiên còn CREATED. */
export function SessionQuestionsPanel({ status, questions, disabled }: SessionQuestionsPanelProps) {
  const [count, setCount] = useState(String(QUESTION_COUNT_DEFAULT))
  const { isLoading, isGenerating, loadError, generateError } = questions
  const canGenerate = status === 'CREATED'
  const hasQuestions = questions.questions.length > 0
  const retryable = generateError ? RETRYABLE_GENERATE_ERRORS.includes(generateError.kind) : false

  if (isLoading) {
    return (
      <div role="status" aria-label="Đang tải câu hỏi" className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  const generate = () => void questions.generate(Number(count))

  return (
    <Stack gap="md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-content">Câu hỏi phỏng vấn</h2>
        {canGenerate && hasQuestions && (
          <div className="flex items-end gap-3">
            <Select
              aria-label="Số câu hỏi"
              options={QUESTION_COUNT_OPTIONS}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              disabled={isGenerating || disabled}
            />
            <Button
              variant="secondary"
              onClick={generate}
              isLoading={isGenerating}
              disabled={isGenerating || disabled}
            >
              Tạo lại
            </Button>
          </div>
        )}
      </div>

      {isGenerating && (
        <p role="status" className="text-sm text-content-muted">
          Đang tạo câu hỏi… có thể mất tới 1 phút, vui lòng không đóng trang.
        </p>
      )}

      {loadError && (
        <Stack gap="sm">
          <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
            {loadError}
          </p>
          <Button variant="secondary" className="self-start" onClick={questions.retryLoad}>
            Tải lại câu hỏi
          </Button>
        </Stack>
      )}

      {generateError && (
        <Stack gap="sm">
          <p role="alert" className="rounded-card bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {generateError.message}
          </p>
          {retryable && canGenerate && (
            <Button
              variant="secondary"
              className="self-start"
              onClick={generate}
              disabled={isGenerating || disabled}
            >
              Thử lại
            </Button>
          )}
        </Stack>
      )}

      {hasQuestions ? (
        <ol className="flex flex-col gap-3">
          {questions.questions.map((question) => (
            <li
              key={question.publicId}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-content-subtle">
                  Câu {question.orderIndex + 1}
                </span>
                <Badge tone={DOMAIN_TONE[question.domain]}>{DOMAIN_LABEL[question.domain]}</Badge>
                <Badge tone={DIFFICULTY_TONE[question.difficulty]}>
                  {DIFFICULTY_LABEL[question.difficulty]}
                </Badge>
              </div>
              <p className="wrap-anywhere text-content">{question.content}</p>
            </li>
          ))}
        </ol>
      ) : (
        !loadError && (
          <div className="flex flex-col items-start gap-3 rounded-card bg-surface-muted p-4">
            <p className="text-content-muted">
              {canGenerate
                ? 'Chưa có câu hỏi. Tạo bộ câu hỏi dựa trên CV của bạn trước khi bắt đầu.'
                : 'Phiên này không có câu hỏi nào.'}
            </p>
            {canGenerate && (
              <div className="flex items-end gap-3">
                <Select
                  aria-label="Số câu hỏi"
                  options={QUESTION_COUNT_OPTIONS}
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  disabled={isGenerating || disabled}
                />
                <Button
                  onClick={generate}
                  isLoading={isGenerating}
                  disabled={isGenerating || disabled}
                >
                  Tạo câu hỏi
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </Stack>
  )
}
