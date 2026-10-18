import { ParsedDataView } from './ParsedDataView'

import { Badge, Button, Card, Spinner } from '@/components/ui'
import { PARSE_STATUS_LABEL, PARSE_STATUS_TONE } from '@/constants/cv'
import type { Cv } from '@/types/cv'
import { formatDate, formatFileSize } from '@/utils/format'

export interface CvDetailPanelProps {
  /** null khi chưa có dữ liệu chi tiết (đang tải hoặc tải lỗi). */
  cv: Cv | null
  isLoading: boolean
  error: string
  onRetry: () => void
}

function DetailBody({ cv }: { cv: Cv }) {
  if (cv.parseStatus === 'PROCESSING') {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <Spinner size="lg" label="Đang phân tích CV" />
        <p className="font-semibold text-content">Đang phân tích…</p>
        <p className="max-w-sm text-sm text-content-muted">
          Hệ thống đang đọc kỹ năng, kinh nghiệm và dự án trong CV. Thường mất 10–30 giây.
        </p>
      </div>
    )
  }

  if (cv.parseStatus === 'FAILED') {
    return (
      <div className="p-6">
        <p role="alert" className="rounded-control bg-danger-50 px-4 py-3 text-sm text-danger-700">
          Không đọc được nội dung CV. File có thể là ảnh scan hoặc bị khoá bằng mật khẩu.
        </p>
      </div>
    )
  }

  if (cv.parseStatus === 'COMPLETED' && cv.parsedData) {
    return (
      <div className="p-6">
        <ParsedDataView data={cv.parsedData} />
      </div>
    )
  }

  // PENDING: đã lưu nhưng chưa ai phân tích.
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-content">CV đã được lưu</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-content-muted">
        CV đang chờ phân tích. Khi có kết quả, kỹ năng và kinh nghiệm sẽ hiện ở đây.
      </p>
    </div>
  )
}

export function CvDetailPanel({ cv, isLoading, error, onRetry }: CvDetailPanelProps) {
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

  return (
    <Card padding="none">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold wrap-anywhere text-content">{cv.fileName}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-content-muted">
            {formatFileSize(cv.fileSize)} &middot; Tải lên {formatDate(cv.createdAt)}
            <Badge tone={PARSE_STATUS_TONE[cv.parseStatus]}>
              {PARSE_STATUS_LABEL[cv.parseStatus]}
            </Badge>
          </p>
        </div>
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
      <DetailBody cv={cv} />
    </Card>
  )
}
