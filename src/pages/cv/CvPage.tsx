import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'

import {
  CvConfirmDialog,
  CvDetailPanel,
  CvDropzone,
  CvList,
  CvUploadProgress,
} from '@/components/cv'
import { EmptyState, PageHeader, Spinner, Stack, Button } from '@/components/ui'
import { CV_MIME_TYPE } from '@/constants/cv'
import { useCvParse } from '@/hooks/useCvParse'
import { useCvUpload } from '@/hooks/useCvUpload'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { cvService } from '@/services/cvService'
import type { ApiError } from '@/types/api'
import type { Cv, CvParsedData, CvSummary } from '@/types/cv'

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
  const [confirm, setConfirm] = useState<'delete' | 'replace' | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const replaceInputRef = useRef<HTMLInputElement>(null)

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

  const applyCv = useCallback((cv: Cv) => {
    setCvs((previous) => previous.map((item) => (item.publicId === cv.publicId ? cv : item)))
    setDetails((previous) => ({ ...previous, [cv.publicId]: cv }))
  }, [])

  const { parsingIds, failureReasons, parse } = useCvParse({ onChanged: applyCv })

  // Thay file trả về CV đã có trong danh sách: cập nhật tại chỗ thay vì thêm một dòng mới.
  const handleUploaded = useCallback(
    (cv: Cv) => {
      const isReplacement = cvs.some((item) => item.publicId === cv.publicId)
      setCvs((previous) =>
        isReplacement
          ? previous.map((item) => (item.publicId === cv.publicId ? cv : item))
          : [cv, ...previous],
      )
      setDetails((previous) => ({ ...previous, [cv.publicId]: cv }))
      setSelectedId(cv.publicId)
      toast.success(isReplacement ? 'Đã thay file CV' : 'Đã tải CV lên', cv.fileName)
      void parse(cv.publicId)
    },
    [cvs, toast, parse],
  )
  const upload = useCvUpload({ onUploaded: handleUploaded })

  const saveParsedData = useCallback(
    async (publicId: string, parsedData: CvParsedData) => {
      const cv = await cvService.updateParsedData(publicId, parsedData)
      applyCv(cv)
      toast.success('Đã lưu chỉnh sửa', cv.fileName)
    },
    [applyCv, toast],
  )

  const refreshCv = useCallback(
    (publicId: string) => {
      cvService
        .getById(publicId)
        .then(applyCv)
        .catch(() => {})
    },
    [applyCv],
  )

  const removeSelectedCv = useCallback(async () => {
    if (!selectedId) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await cvService.remove(selectedId)
    } catch (cause) {
      // 404: CV đã không còn trên server, cứ bỏ khỏi màn hình như vừa xoá xong.
      if ((cause as ApiError).status !== 404) {
        setDeleteError((cause as ApiError).message || 'Không xoá được CV, hãy thử lại')
        setIsDeleting(false)
        return
      }
    }

    const name =
      details[selectedId]?.fileName ?? cvs.find((cv) => cv.publicId === selectedId)?.fileName
    const remaining = cvs.filter((cv) => cv.publicId !== selectedId)
    setCvs(remaining)
    setDetails((previous) => {
      const { [selectedId]: _removed, ...rest } = previous
      return rest
    })
    setSelectedId((remaining.find((cv) => cv.isActive) ?? remaining[0])?.publicId ?? null)
    toast.success('Đã xoá CV', name)
    setConfirm(null)
    setIsDeleting(false)
  }, [selectedId, cvs, details, toast])

  function askDelete() {
    setDeleteError('')
    setConfirm('delete')
  }

  // Thay file làm mất kết quả phân tích (kể cả phần đã chỉnh tay), nên chỉ hỏi lại khi có thứ để mất.
  function askReplace() {
    if (selectedDetail?.parseStatus === 'COMPLETED') setConfirm('replace')
    else replaceInputRef.current?.click()
  }

  function pickReplacement() {
    setConfirm(null)
    replaceInputRef.current?.click()
  }

  function handleReplacementChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file && selectedId) void upload.upload(file, selectedId)
  }

  const parsing = new Set(parsingIds)
  const shownCvs = cvs.map((cv) =>
    parsing.has(cv.publicId) ? { ...cv, parseStatus: 'PROCESSING' as const } : cv,
  )

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
            <CvList cvs={shownCvs} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="min-w-0 flex-[1.7] basis-[440px]">
            <CvDetailPanel
              key={selectedId}
              cv={selectedDetail ?? null}
              isLoading={isLoadingDetail}
              error={hasDetailError ? detailError.message : ''}
              isParsing={!!selectedId && parsing.has(selectedId)}
              failureReason={selectedId ? failureReasons[selectedId] : undefined}
              isBusy={upload.isUploading || isDeleting}
              onReplace={askReplace}
              onDelete={askDelete}
              onRetry={() => {
                setDetailError(null)
                setRetryCount((count) => count + 1)
              }}
              onParse={() => selectedId && void parse(selectedId)}
              onRefresh={() => selectedId && refreshCv(selectedId)}
              onSaveParsedData={(data) => saveParsedData(selectedId!, data)}
            />
          </div>
        </div>
      )}

      <input
        ref={replaceInputRef}
        type="file"
        accept={CV_MIME_TYPE}
        className="hidden"
        tabIndex={-1}
        aria-label="Chọn file CV thay thế"
        onChange={handleReplacementChosen}
      />

      <CvConfirmDialog
        open={confirm === 'delete'}
        title="Xoá CV này?"
        confirmLabel="Xoá CV"
        tone="danger"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={() => void removeSelectedCv()}
        onClose={() => setConfirm(null)}
      >
        <p>
          <strong className="font-semibold wrap-anywhere text-content">
            {selectedDetail?.fileName}
          </strong>{' '}
          sẽ bị xoá cùng file PDF đã tải lên. Không thể hoàn tác.
        </p>
        <p>Các buổi phỏng vấn đã tạo từ CV này vẫn được giữ nguyên.</p>
      </CvConfirmDialog>

      <CvConfirmDialog
        open={confirm === 'replace'}
        title="Thay file CV?"
        confirmLabel="Chọn file mới"
        onConfirm={pickReplacement}
        onClose={() => setConfirm(null)}
      >
        <p>
          Kết quả phân tích và các chỉnh sửa của bạn sẽ bị xoá. CV sẽ được phân tích lại từ file
          mới.
        </p>
      </CvConfirmDialog>
    </Stack>
  )
}
