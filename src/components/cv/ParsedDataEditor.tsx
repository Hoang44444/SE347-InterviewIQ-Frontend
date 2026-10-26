import { useState, type FormEvent, type ReactNode } from 'react'

import {
  emptyEducation,
  emptyExperience,
  emptyProject,
  toDraft,
  toParsedData,
  validateDraft,
  type ParsedDataDraft,
} from './parsedDataDraft'

import { Button, Input, Textarea } from '@/components/ui'
import type { ApiError } from '@/types/api'
import type { CvParsedData } from '@/types/cv'

const LIST_HINT = 'Cách nhau bằng dấu phẩy'

function updateAt<T>(list: T[], index: number, change: Partial<T>): T[] {
  return list.map((item, position) => (position === index ? { ...item, ...change } : item))
}

function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, position) => position !== index)
}

function describeError(cause: unknown): string {
  const { message, errors } = cause as ApiError
  const details = Object.entries(errors ?? {})
    .slice(0, 3)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
  return [message || 'Không lưu được, hãy thử lại', ...details].join(' · ')
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-content-subtle uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Row({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border p-4">
      {children}
      <Button variant="ghost" size="sm" className="self-end" onClick={onRemove}>
        Xoá mục này
      </Button>
    </div>
  )
}

export interface ParsedDataEditorProps {
  initial: CvParsedData
  /** Ném lỗi (ApiError) nếu lưu thất bại; editor sẽ hiện lỗi và giữ nguyên nội dung đang sửa. */
  onSave: (data: CvParsedData) => Promise<void>
  onCancel: () => void
}

export function ParsedDataEditor({ initial, onSave, onCancel }: ParsedDataEditorProps) {
  const [draft, setDraft] = useState<ParsedDataDraft>(() => toDraft(initial))
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const change = (patch: Partial<ParsedDataDraft>) =>
    setDraft((previous) => ({ ...previous, ...patch }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validateDraft(draft)
    if (problem) {
      setError(problem)
      return
    }

    setError('')
    setIsSaving(true)
    try {
      await onSave(toParsedData(draft))
    } catch (cause) {
      setError(describeError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Section title="Tóm tắt">
        <Textarea
          aria-label="Tóm tắt"
          value={draft.summary}
          maxLength={2000}
          onChange={(event) => change({ summary: event.target.value })}
        />
      </Section>

      <Section title="Kỹ năng">
        <Input
          label="Ngôn ngữ"
          hint={LIST_HINT}
          value={draft.languages}
          onChange={(event) => change({ languages: event.target.value })}
        />
        <Input
          label="Framework"
          hint={LIST_HINT}
          value={draft.frameworks}
          onChange={(event) => change({ frameworks: event.target.value })}
        />
        <Input
          label="CSDL"
          hint={LIST_HINT}
          value={draft.databases}
          onChange={(event) => change({ databases: event.target.value })}
        />
        <Input
          label="Công cụ"
          hint={LIST_HINT}
          value={draft.tools}
          onChange={(event) => change({ tools: event.target.value })}
        />
      </Section>

      <Section title="Kinh nghiệm">
        {draft.experiences.map((item, index) => (
          <Row
            key={item.key}
            onRemove={() => change({ experiences: removeAt(draft.experiences, index) })}
          >
            <Input
              label="Công ty"
              value={item.company}
              onChange={(event) =>
                change({
                  experiences: updateAt(draft.experiences, index, { company: event.target.value }),
                })
              }
            />
            <Input
              label="Vị trí"
              value={item.position}
              onChange={(event) =>
                change({
                  experiences: updateAt(draft.experiences, index, { position: event.target.value }),
                })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Bắt đầu"
                type="month"
                value={item.startDate}
                onChange={(event) =>
                  change({
                    experiences: updateAt(draft.experiences, index, {
                      startDate: event.target.value,
                    }),
                  })
                }
              />
              <Input
                label="Kết thúc"
                type="month"
                hint="Để trống nếu vẫn đang làm"
                value={item.endDate}
                onChange={(event) =>
                  change({
                    experiences: updateAt(draft.experiences, index, {
                      endDate: event.target.value,
                    }),
                  })
                }
              />
            </div>
            <Textarea
              label="Mô tả"
              value={item.description}
              onChange={(event) =>
                change({
                  experiences: updateAt(draft.experiences, index, {
                    description: event.target.value,
                  }),
                })
              }
            />
            <Input
              label="Công nghệ"
              hint={LIST_HINT}
              value={item.technologies}
              onChange={(event) =>
                change({
                  experiences: updateAt(draft.experiences, index, {
                    technologies: event.target.value,
                  }),
                })
              }
            />
          </Row>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => change({ experiences: [...draft.experiences, emptyExperience()] })}
        >
          Thêm kinh nghiệm
        </Button>
      </Section>

      <Section title="Học vấn">
        {draft.education.map((item, index) => (
          <Row
            key={item.key}
            onRemove={() => change({ education: removeAt(draft.education, index) })}
          >
            <Input
              label="Trường"
              value={item.institution}
              onChange={(event) =>
                change({
                  education: updateAt(draft.education, index, { institution: event.target.value }),
                })
              }
            />
            <Input
              label="Bằng cấp"
              value={item.degree}
              onChange={(event) =>
                change({
                  education: updateAt(draft.education, index, { degree: event.target.value }),
                })
              }
            />
            <Input
              label="Năm tốt nghiệp"
              inputMode="numeric"
              maxLength={4}
              value={item.graduationYear}
              onChange={(event) =>
                change({
                  education: updateAt(draft.education, index, {
                    graduationYear: event.target.value,
                  }),
                })
              }
            />
          </Row>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => change({ education: [...draft.education, emptyEducation()] })}
        >
          Thêm học vấn
        </Button>
      </Section>

      <Section title="Dự án">
        {draft.projects.map((item, index) => (
          <Row
            key={item.key}
            onRemove={() => change({ projects: removeAt(draft.projects, index) })}
          >
            <Input
              label="Tên dự án"
              value={item.name}
              onChange={(event) =>
                change({ projects: updateAt(draft.projects, index, { name: event.target.value }) })
              }
            />
            <Input
              label="Vai trò"
              value={item.role}
              onChange={(event) =>
                change({ projects: updateAt(draft.projects, index, { role: event.target.value }) })
              }
            />
            <Textarea
              label="Mô tả dự án"
              value={item.description}
              onChange={(event) =>
                change({
                  projects: updateAt(draft.projects, index, { description: event.target.value }),
                })
              }
            />
          </Row>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => change({ projects: [...draft.projects, emptyProject()] })}
        >
          Thêm dự án
        </Button>
      </Section>

      {error && (
        <p role="alert" className="rounded-control bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Huỷ
        </Button>
        <Button type="submit" isLoading={isSaving}>
          Lưu
        </Button>
      </div>
    </form>
  )
}
