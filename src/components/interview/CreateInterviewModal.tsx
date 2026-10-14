import { useEffect, useRef, useState, type FormEvent } from 'react'

import { Button, Input, Modal, Select, Spinner, Stack, Textarea } from '@/components/ui'
import { cvService } from '@/services/cvService'
import { interviewService } from '@/services/interviewService'
import type { ApiError } from '@/types/api'
import type { CvSummary } from '@/types/cv'
import type { CreatedInterviewSession, CreateInterviewSessionPayload } from '@/types/interview'

type FormField = 'cvPublicId' | 'title' | 'jobDescription'
type FieldErrors = Partial<Record<FormField, string>>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isEligible(cv: CvSummary) {
  return cv.isActive === true && cv.parseStatus === 'COMPLETED'
}

function getCvLabel(cv: CvSummary) {
  if (!cv.isActive) return `${cv.fileName} — Không active`
  if (cv.parseStatus === 'FAILED') return `${cv.fileName} — Xử lý thất bại`
  if (cv.parseStatus !== 'COMPLETED') return `${cv.fileName} — Đang chờ xử lý`
  return cv.fileName
}

function validateTitle(title: string) {
  if (!title.trim()) return 'Vui lòng nhập tên buổi phỏng vấn.'
  if (title.trim().length > 255) return 'Tên buổi phỏng vấn tối đa 255 ký tự.'
}

function validateJd(jobDescription: string) {
  if (jobDescription.length > 10000) return 'Mô tả công việc tối đa 10.000 ký tự.'
}

export function CreateInterviewModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (session: CreatedInterviewSession) => void
}) {
  const [cvs, setCvs] = useState<CvSummary[]>([])
  const [isLoadingCvs, setIsLoadingCvs] = useState(true)
  const [cvLoadError, setCvLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [form, setForm] = useState({ cvPublicId: '', title: '', jobDescription: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const createLock = useRef(false)
  const activeRef = useRef(false)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    cvService
      .list()
      .then((result) => {
        if (!active) return
        setCvs(result)
        setForm((previous) => ({
          ...previous,
          cvPublicId: result.some((cv) => cv.publicId === previous.cvPublicId && isEligible(cv))
            ? previous.cvPublicId
            : '',
        }))
      })
      .catch((err: ApiError) => {
        if (active) setCvLoadError(`Không tải được danh sách CV. ${err.message}`)
      })
      .finally(() => {
        if (active) setIsLoadingCvs(false)
      })
    return () => {
      active = false
    }
  }, [reloadToken])

  useEffect(() => {
    if (createError) errorRef.current?.focus()
  }, [createError])

  const hasEligibleCv = cvs.some(isEligible)
  const selectedCv = cvs.find((cv) => cv.publicId === form.cvPublicId && isEligible(cv))
  const cvUnavailable = isLoadingCvs || !!cvLoadError || !hasEligibleCv

  function reloadCvs() {
    setIsLoadingCvs(true)
    setCvLoadError('')
    setReloadToken((previous) => previous + 1)
  }

  function updateField(field: FormField, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }))
    setCreateError('')
  }

  function close() {
    if (!createLock.current) onClose()
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (createLock.current) return

    const errors: FieldErrors = {
      title: validateTitle(form.title),
      jobDescription: validateJd(form.jobDescription),
      cvPublicId:
        cvUnavailable || !selectedCv || !UUID_PATTERN.test(form.cvPublicId)
          ? 'Vui lòng chọn CV active đã xử lý xong.'
          : undefined,
    }
    setFieldErrors(errors)
    if (Object.values(errors).some(Boolean)) {
      setCreateError('Vui lòng kiểm tra các trường được đánh dấu bên dưới.')
      return
    }

    createLock.current = true
    setIsCreating(true)
    setCreateError('')
    const payload: CreateInterviewSessionPayload = {
      cvPublicId: form.cvPublicId,
      title: form.title.trim(),
      ...(form.jobDescription.trim() ? { jobDescription: form.jobDescription } : {}),
    }
    try {
      const result = await interviewService.createSession(payload)
      if (!activeRef.current) return
      onCreated({ ...result, title: payload.title, cvFileName: selectedCv!.fileName })
    } catch (err) {
      if (!activeRef.current) return
      const error = err as ApiError
      switch (error.status) {
        case 400:
          setFieldErrors({
            cvPublicId: error.errors?.cvPublicId?.join(' '),
            title: error.errors?.title?.join(' '),
            jobDescription: error.errors?.jobDescription?.join(' '),
          })
          setCreateError('Thông tin chưa hợp lệ. Vui lòng kiểm tra và thử lại.')
          break
        case 401:
          // apiClient xoá token và chuyển tới trang đăng nhập.
          setCreateError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
          break
        case 403:
          setCreateError('Tài khoản không có quyền tạo phòng phỏng vấn.')
          break
        case 404:
          setForm((previous) => ({ ...previous, cvPublicId: '' }))
          setCreateError('CV không còn khả dụng. Vui lòng chọn lại CV sau khi tải lại danh sách.')
          reloadCvs()
          break
        default:
          setCreateError('Tạo phòng thất bại. Vui lòng thử lại sau ít phút.')
      }
    } finally {
      createLock.current = false
      if (activeRef.current) setIsCreating(false)
    }
  }

  return (
    <Modal
      open
      onClose={close}
      dismissible={!isCreating}
      title="Tạo phòng phỏng vấn"
      description="Chọn CV và thêm thông tin cho buổi phỏng vấn của bạn."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isCreating}>
            Huỷ
          </Button>
          <Button
            type="submit"
            form="create-interview-form"
            isLoading={isCreating}
            disabled={cvUnavailable || !selectedCv || !form.title.trim()}
          >
            {isCreating ? 'Đang tạo phòng…' : 'Tạo phòng'}
          </Button>
        </>
      }
    >
      <form id="create-interview-form" onSubmit={handleCreate} noValidate aria-busy={isCreating}>
        <Stack gap="lg">
          {createError && (
            <p ref={errorRef} role="alert" tabIndex={-1} className="text-sm text-danger-700">
              {createError}
            </p>
          )}

          <Stack gap="sm">
            <Select
              label="Chọn CV"
              required
              placeholder={isLoadingCvs ? 'Đang tải danh sách CV…' : 'Chọn CV cho buổi phỏng vấn'}
              value={form.cvPublicId}
              onChange={(event) => updateField('cvPublicId', event.target.value)}
              options={cvs.map((cv) => ({
                value: cv.publicId,
                label: getCvLabel(cv),
                disabled: !isEligible(cv),
              }))}
              disabled={isCreating || cvUnavailable}
              error={fieldErrors.cvPublicId}
              hint="Chỉ sử dụng CV của bạn đang active và đã xử lý hoàn tất."
            />
            {isLoadingCvs ? (
              <div role="status" className="flex items-center gap-2 text-sm text-content-muted">
                <Spinner size="sm" /> Đang tải danh sách CV…
              </div>
            ) : cvLoadError ? (
              <p role="alert" className="text-sm text-danger-700">
                {cvLoadError}
              </p>
            ) : !hasEligibleCv ? (
              <div role="status" className="rounded-card bg-surface-muted px-4 py-3">
                <p className="text-sm font-medium text-content">Chưa có CV sẵn sàng để tạo phòng</p>
                <p className="mt-1 text-sm text-content-muted">
                  Hãy tải CV lên tài khoản và chờ xử lý hoàn tất. Nếu CV đang xử lý, hãy chờ rồi tải
                  lại danh sách. CV xử lý thất bại hoặc không active không thể dùng tạo phòng.
                </p>
              </div>
            ) : null}
            <Button
              variant="link"
              size="sm"
              className="self-start"
              onClick={() => void reloadCvs()}
              disabled={isLoadingCvs || isCreating}
            >
              Tải lại danh sách CV
            </Button>
          </Stack>

          <Input
            label="Tên buổi phỏng vấn"
            required
            maxLength={255}
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            onBlur={() =>
              setFieldErrors((previous) => ({ ...previous, title: validateTitle(form.title) }))
            }
            placeholder="Phỏng vấn Backend Developer"
            disabled={isCreating}
            error={fieldErrors.title}
            hint={`${form.title.length}/255 ký tự`}
          />
          <Textarea
            label="Mô tả công việc / JD"
            maxLength={10000}
            rows={5}
            value={form.jobDescription}
            onChange={(event) => updateField('jobDescription', event.target.value)}
            onBlur={() =>
              setFieldErrors((previous) => ({
                ...previous,
                jobDescription: validateJd(form.jobDescription),
              }))
            }
            placeholder="Mô tả vị trí, yêu cầu kỹ năng và kinh nghiệm…"
            disabled={isCreating}
            error={fieldErrors.jobDescription}
            hint={`Không bắt buộc · ${form.jobDescription.length.toLocaleString('vi-VN')}/10.000 ký tự`}
          />
        </Stack>
      </form>
    </Modal>
  )
}
