import { useCallback, useEffect, useState } from 'react'

import { CvDetailPanel, CvDropzone, CvList, CvUploadProgress } from '@/components/cv'
import { EmptyState, PageHeader, Spinner, Stack, Button } from '@/components/ui'
import { useCvUpload } from '@/hooks/useCvUpload'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { cvService } from '@/services/cvService'
import type { ApiError } from '@/types/api'
import type { Cv, CvSummary } from '@/types/cv'

export function CvPage() {
  useDocumentTitle('CV của tôi')
  const toast = useToast()

  const [cvs, setCvs] = useState<CvSummary[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [listError, setListError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Chi tiết đã tải, lưu theo publicId để bấm lại CV cũ không phải gọi API lần nữa.
  const [details, setDetails] = useState<Record<string, Cv>>({})
  const [detailError, setDetailError] = useState<{ id: string; message: string } | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Không setState đồng bộ ở đây: effect bên dưới gọi hàm này, chỉ được set trong then/catch.
  const fetchList = useCallback(
    () =>
      cvService
        .list()
        .then((items) => {
          setCvs(items)
          // Chưa chọn gì thì chọn CV chính, không có thì CV mới nhất.
          setSelectedId(
            (current) => current ?? (items.find((cv) => cv.isActive) ?? items[0])?.publicId ?? null,
          )
        })
        .catch((cause: ApiError) => setListError(cause.message || 'Hãy thử lại'))
        .finally(() => setIsLoadingList(false)),
    [],
  )

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  function reloadList() {
    setIsLoadingList(true)
    setListError('')
    void fetchList()
  }

  // Tải chi tiết CV đang chọn (cần fileUrl và parsedData mà danh sách không trả về).
  const selectedDetail = selectedId ? details[selectedId] : undefined
  useEffect(() => {
    if (!selectedId || selectedDetail) return
    let ignore = false
    cvService
      .getById(selectedId)
      .then((cv) => {
        if (!ignore) setDetails((previous) => ({ ...previous, [cv.publicId]: cv }))
      })
      .catch((cause: ApiError) => {
        if (!ignore) setDetailError({ id: selectedId, message: cause.message })
      })
    return () => {
      ignore = true
    }
    // retryCount chỉ để bấm "Thử lại" chạy lại effect khi lần trước lỗi.
  }, [selectedId, selectedDetail, retryCount])

  const handleUploaded = useCallback(
    (cv: Cv) => {
      setCvs((previous) => [cv, ...previous])
      setDetails((previous) => ({ ...previous, [cv.publicId]: cv }))
      setSelectedId(cv.publicId)
      toast.success('Đã tải CV lên', cv.fileName)
    },
    [toast],
  )
  const upload = useCvUpload({ onUploaded: handleUploaded })

  const hasDetailError = detailError?.id === selectedId
  const isLoadingDetail = !!selectedId && !selectedDetail && !hasDetailError

  return (
    <Stack gap="lg">
      <PageHeader
        title="CV của tôi"
        description="Tải CV lên để hệ thống sinh câu hỏi sát với kỹ năng và kinh nghiệm của bạn."
      />

      {upload.file ? (
        <CvUploadProgress
          file={upload.file}
          stage={upload.stage}
          progress={upload.progress}
          onCancel={upload.cancel}
        />
      ) : (
        <CvDropzone onFile={(file) => void upload.upload(file)} />
      )}

      {upload.error && (
        <p role="alert" className="rounded-card bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {upload.error}
        </p>
      )}

      {isLoadingList ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" label="Đang tải danh sách CV" />
        </div>
      ) : listError ? (
        <Stack gap="sm">
          <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
            Chưa tải được danh sách CV: {listError}
          </p>
          <Button variant="secondary" className="self-start" onClick={reloadList}>
            Tải lại
          </Button>
        </Stack>
      ) : cvs.length === 0 ? (
        <EmptyState
          title="Bạn chưa có CV nào"
          description="Tải file PDF đầu tiên lên để bắt đầu."
        />
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1 basis-[340px]">
            <CvList cvs={cvs} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="min-w-0 flex-[1.7] basis-[440px]">
            <CvDetailPanel
              cv={selectedDetail ?? null}
              isLoading={isLoadingDetail}
              error={hasDetailError ? detailError.message : ''}
              onRetry={() => {
                setDetailError(null)
                setRetryCount((count) => count + 1)
              }}
            />
          </div>
        </div>
      )}
    </Stack>
  )
}
