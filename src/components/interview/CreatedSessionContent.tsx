import { useState, type ReactNode } from 'react'

import { QuestionGenerationPanel } from './QuestionGenerationPanel'

import { Button, Stack } from '@/components/ui'
import { useSessionQuestions } from '@/hooks/useSessionQuestions'
import type { InterviewSession } from '@/types/interview'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'

/** JD dài hơn ngưỡng này (ký tự hoặc dòng) thì thu gọn, mở dần bằng nút Xem đầy đủ. */
const JD_PREVIEW_LIMIT = 140
const JD_PREVIEW_LINES = 4

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-card border border-border bg-surface-muted px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="size-5"
        >
          {icon}
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-content-subtle uppercase">{label}</p>
        <p className="truncate text-sm font-semibold text-content">{value}</p>
      </div>
    </div>
  )
}

/** Nội dung phòng của phiên CREATED: tóm tắt, JD đã lưu, sinh câu hỏi và nút Bắt đầu. */
export function CreatedSessionContent({
  session,
  onStart,
  isStarting,
  startDisabled,
}: {
  session: InterviewSession
  onStart: () => void
  isStarting: boolean
  startDisabled: boolean
}) {
  const questions = useSessionQuestions(session.sessionPublicId)
  const [isJdExpanded, setIsJdExpanded] = useState(false)
  const jd = session.jobDescription?.trim() ?? ''
  const isJdLong = jd.length > JD_PREVIEW_LIMIT || jd.split('\n').length > JD_PREVIEW_LINES
  const hasQuestions = questions.questions.length > 0

  return (
    <Stack gap="lg">
      <Stack gap="md">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile
            label="CV"
            value={session.cvPublicId ? 'Đã gắn CV' : 'Không có CV'}
            icon={
              <>
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <polyline points="14 3 14 8 19 8" />
              </>
            }
          />
          <InfoTile
            label="Ngày tạo"
            value={formatDate(session.createdAt)}
            icon={
              <>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="3" x2="8" y2="7" />
                <line x1="16" y1="3" x2="16" y2="7" />
              </>
            }
          />
          <InfoTile
            label="Câu hỏi"
            value={hasQuestions ? `${questions.questions.length} câu hỏi` : 'Chưa sinh'}
            icon={
              <>
                <line x1="9" y1="6" x2="20" y2="6" />
                <line x1="9" y1="12" x2="20" y2="12" />
                <line x1="9" y1="18" x2="20" y2="18" />
                <circle cx="4.5" cy="6" r="1" />
                <circle cx="4.5" cy="12" r="1" />
                <circle cx="4.5" cy="18" r="1" />
              </>
            }
          />
        </div>
        <div className="rounded-card border border-brand-100 bg-brand-50 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-brand-600 shadow-card">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="size-5"
              >
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                <line x1="3" y1="13" x2="21" y2="13" />
              </svg>
            </span>
            <p className="flex-1 text-xs font-semibold tracking-wide text-brand-700 uppercase">
              Mô tả công việc (JD)
            </p>
            {isJdLong && (
              <Button
                variant="secondary"
                size="sm"
                aria-expanded={isJdExpanded}
                onClick={() => setIsJdExpanded((previous) => !previous)}
              >
                {isJdExpanded ? 'Thu gọn' : 'Xem đầy đủ'}
              </Button>
            )}
          </div>
          {jd ? (
            <div className="relative mt-3">
              <p
                className={cn(
                  'text-sm leading-6 whitespace-pre-wrap wrap-anywhere text-content',
                  !isJdExpanded && 'max-h-24 overflow-hidden',
                )}
              >
                {jd}
              </p>
              {isJdLong && !isJdExpanded && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-brand-50"
                />
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-content-muted">
              Phiên này không có JD. JD chỉ nhập được lúc tạo phòng.
            </p>
          )}
        </div>
      </Stack>
      <hr className="border-border" />
      <QuestionGenerationPanel
        questions={questions.questions}
        isLoading={questions.isLoading}
        loadError={questions.loadError}
        isGenerating={questions.isGenerating}
        generateError={questions.generateError}
        onGenerate={(count) => void questions.generate(count)}
        onReload={() => void questions.reload()}
      />
      <Button
        size="lg"
        className="self-start"
        onClick={onStart}
        isLoading={isStarting}
        disabled={startDisabled || !hasQuestions || questions.isGenerating}
      >
        Bắt đầu
      </Button>
    </Stack>
  )
}
