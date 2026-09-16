import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Stack,
} from '@/components/ui'
import { KIND_OPTIONS, STATUS_LABEL, STATUS_TONE } from '@/constants/interview'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { Interview, QuestionKind } from '@/types/interview'
import { formatDate } from '@/utils/format'

export function InterviewListPage() {
  useDocumentTitle('Phòng phỏng vấn')
  const toast = useToast()

  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({ title: '', position: '', kind: 'behavioral' as QuestionKind })

  useEffect(() => {
    // Huỷ set state nếu component đã unmount trước khi request xong.
    let active = true

    interviewService
      .list()
      .then((result) => {
        if (active) setInterviews(result.items)
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
  }, [])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    try {
      const created = await interviewService.create(form)
      setInterviews((previous) => [created, ...previous])
      setIsModalOpen(false)
      setForm({ title: '', position: '', kind: 'behavioral' })
      toast.success('Đã tạo buổi phỏng vấn', created.title)
    } catch (err) {
      toast.error('Không tạo được buổi phỏng vấn', (err as ApiError).message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="Phòng phỏng vấn"
        description="Danh sách các buổi luyện tập của bạn."
        actions={<Button onClick={() => setIsModalOpen(true)}>Tạo buổi mới</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {loadError && (
            <p
              role="alert"
              className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700"
            >
              Chưa tải được danh sách: {loadError}. Kiểm tra backend và biến VITE_API_URL trong file
              .env.
            </p>
          )}

          {!loadError && interviews.length === 0 && (
            <EmptyState
              title="Chưa có buổi phỏng vấn nào"
              description="Tạo buổi đầu tiên để bắt đầu luyện tập."
              action={<Button onClick={() => setIsModalOpen(true)}>Tạo buổi mới</Button>}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {interviews.map((interview) => (
              <Link key={interview.id} to={ROUTES.interviewRoom(interview.id)}>
                <Card interactive className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-content">{interview.title}</h2>
                    <Badge tone={STATUS_TONE[interview.status]}>
                      {STATUS_LABEL[interview.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-content-muted">{interview.position}</p>
                  <p className="mt-3 text-xs text-content-subtle">
                    {interview.questionCount} câu hỏi &middot; {formatDate(interview.createdAt)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo buổi phỏng vấn"
        description="Điền thông tin để hệ thống sinh bộ câu hỏi phù hợp."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" form="create-interview-form" isLoading={isCreating}>
              Tạo buổi
            </Button>
          </>
        }
      >
        <form id="create-interview-form" onSubmit={handleCreate}>
          <Stack gap="md">
            <Input
              label="Tiêu đề"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Phỏng vấn Frontend vòng 1"
            />
            <Input
              label="Vị trí ứng tuyển"
              required
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="Frontend Developer"
            />
            <Select
              label="Loại câu hỏi"
              options={KIND_OPTIONS}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as QuestionKind })}
            />
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
