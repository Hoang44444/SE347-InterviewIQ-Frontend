import { useState } from 'react'

import { ParsedDataEditor } from './ParsedDataEditor'
import { ParsedDataView } from './ParsedDataView'

import { Badge, Button, Card, Spinner } from '@/components/ui'
import { PARSE_STATUS_LABEL, PARSE_STATUS_TONE } from '@/constants/cv'
import type { Cv, CvParsedData } from '@/types/cv'
import { formatDate, formatFileSize } from '@/utils/format'

export interface CvDetailPanelProps {
  /** null khi chưa có dữ liệu chi tiết (đang tải hoặc tải lỗi). */
  cv: Cv | null
  isLoading: boolean
  error: string
  /** Trang này đang gọi phân tích cho CV đang xem. */
  isParsing: boolean
  onRetry: () => void
  onParse: () => void
  /** Hỏi lại trạng thái thật khi CV đang PROCESSING mà không phải do trang này gọi. */
  onRefresh: () => void
  /** Ném lỗi (ApiError) nếu lưu thất bại. */
  onSaveParsedData: (data: CvParsedData) => Promise<void>
}

interface DetailBodyProps {
  cv: Cv
  isParsing: boolean
  isEditing: boolean
  onParse: () => void
  onRefresh: () => void
  onSave: (data: CvParsedData) => Promise<void>
  onCancelEdit: () => void
}

function DetailBody({
  cv,
  isParsing,
  isEditing,
  onParse,
  onRefresh,
  onSave,
  onCancelEdit,
}: DetailBodyProps) {
  if (isParsing || cv.parseStatus === 'PROCESSING') {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <Spinner size="lg" label="Đang phân tích CV" />
        <p className="font-semibold text-content">Đang phân tích…</p>
        <p className="max-w-sm text-sm text-content-muted">
          Hệ thống đang đọc kỹ năng, kinh nghiệm và dự án trong CV. Thường mất 10–30 giây.
        </p>
        {!isParsing && (
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            Kiểm tra lại
          </Button>
        )}
      </div>
    )
  }

  if (cv.parseStatus === 'FAILED') {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p
          role="alert"
          className="w-full rounded-control bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          Không đọc được nội dung CV. File có thể là ảnh scan hoặc bị khoá bằng mật khẩu.
        </p>
        <Button onClick={onParse}>Phân tích lại</Button>
      </div>
    )
  }

  if (cv.parseStatus === 'COMPLETED' && cv.parsedData) {
    return (
      <div className="p-6">
        {isEditing ? (
          <ParsedDataEditor initial={cv.parsedData} onSave={onSave} onCancel={onCancelEdit} />
        ) : (
          <ParsedDataView data={cv.parsedData} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="font-semibold text-content">CV chưa được phân tích</p>
      <p className="max-w-sm text-sm text-content-muted">
        Phân tích để hệ thống đọc kỹ năng và kinh nghiệm trong CV, dùng cho việc sinh câu hỏi.
      </p>
      <Button onClick={onParse}>Phân tích ngay</Button>
    </div>
  )
}

export function CvDetailPanel({
  cv,
  isLoading,
  error,
  isParsing,
  onRetry,
  onParse,
  onRefresh,
  onSaveParsedData,
}: CvDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (isLoading) {
    return (
      <Card className="flex justify-center py-16">
        <Spinner size="lg" label="Đang tải CV" />
      </Card>
    )
  }

  if (!cv) {
    return (
      <Card>
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-danger-700">
            {error || 'Không tải được chi tiết CV.'}
          </p>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      </Card>
    )
  }

  const status = isParsing ? 'PROCESSING' : cv.parseStatus
  const canEdit = status === 'COMPLETED' && cv.parsedData !== null && !isEditing

  async function save(data: CvParsedData) {
    await onSaveParsedData(data)
    setIsEditing(false)
  }

  return (
    <Card padding="none">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold wrap-anywhere text-content">{cv.fileName}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-content-muted">
            {formatFileSize(cv.fileSize)} &middot; Tải lên {formatDate(cv.createdAt)}
            <Badge tone={PARSE_STATUS_TONE[status]}>{PARSE_STATUS_LABEL[status]}</Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              Chỉnh sửa
            </Button>
          )}
          {/* fileUrl đã được backend kiểm tra là file trong thư mục cvs/ của Cloudinary mình. */}
          <a
            href={cv.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-control bg-surface px-3 text-sm font-medium text-content ring-1 ring-border-strong transition hover:bg-surface-muted"
          >
            Xem file
          </a>
        </div>
      </div>
      <DetailBody
        cv={cv}
        isParsing={isParsing}
        isEditing={isEditing}
        onParse={onParse}
        onRefresh={onRefresh}
        onSave={save}
        onCancelEdit={() => setIsEditing(false)}
      />
    </Card>
  )
}
