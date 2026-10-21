import { Button, Card } from '@/components/ui'
import type { CvUploadingFile } from '@/hooks/useCvUpload'
import type { CvUploadStage } from '@/types/cv'
import { cn } from '@/utils/cn'
import { formatFileSize } from '@/utils/format'

const STAGES: { key: CvUploadStage; label: string }[] = [
  { key: 'signing', label: 'Chuẩn bị' },
  { key: 'uploading', label: 'Tải lên' },
  { key: 'saving', label: 'Lưu CV' },
]

export interface CvUploadProgressProps {
  file: CvUploadingFile
  stage: CvUploadStage
  /** Phần trăm đã gửi lên Cloudinary, 0 → 100. */
  progress: number
  onCancel: () => void
}

export function CvUploadProgress({ file, stage, progress, onCancel }: CvUploadProgressProps) {
  const currentIndex = STAGES.findIndex((item) => item.key === stage)
  const percent = stage === 'signing' ? 4 : stage === 'saving' ? 100 : progress
  const stageLabel =
    stage === 'signing'
      ? 'Đang chuẩn bị…'
      : stage === 'uploading'
        ? `Đang tải lên ${progress}%`
        : 'Đang lưu CV…'

  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-danger-50 text-[11px] font-bold text-danger-700">
            PDF
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-content">{file.name}</p>
            <p className="mt-0.5 text-xs text-content-subtle">
              {formatFileSize(file.size)} &middot; {stageLabel}
            </p>
          </div>
          {/* Sang bước lưu thì request đã gửi đi, không huỷ được nữa. */}
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={stage === 'saving'}>
            Huỷ
          </Button>
        </div>

        <div
          role="progressbar"
          aria-label="Tiến độ tải CV"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ol className="flex flex-wrap gap-4 text-xs">
          {STAGES.map((item, index) => {
            const isDone = index < currentIndex
            const isCurrent = index === currentIndex
            return (
              <li
                key={item.key}
                className={cn(
                  'flex items-center gap-1.5',
                  isCurrent ? 'font-semibold text-content' : 'text-content-subtle',
                  isDone && 'text-content',
                )}
              >
                <span
                  className={cn(
                    'flex size-[18px] items-center justify-center rounded-full text-[10px] font-bold text-white',
                    isDone ? 'bg-success-600' : isCurrent ? 'bg-brand-600' : 'bg-border-strong',
                  )}
                >
                  {isDone ? '✓' : index + 1}
                </span>
                {item.label}
              </li>
            )
          })}
        </ol>
      </div>
    </Card>
  )
}
