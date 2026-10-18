import { Badge, Card } from '@/components/ui'
import { PARSE_STATUS_LABEL, PARSE_STATUS_TONE } from '@/constants/cv'
import type { CvSummary } from '@/types/cv'
import { cn } from '@/utils/cn'
import { formatDate, formatFileSize } from '@/utils/format'

export interface CvListProps {
  cvs: CvSummary[]
  selectedId: string | null
  onSelect: (publicId: string) => void
}

export function CvList({ cvs, selectedId, onSelect }: CvListProps) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="text-sm font-medium text-content-muted">CV đã tải lên</p>
        <p className="text-xs text-content-subtle">{cvs.length} file</p>
      </div>
      <ol className="mt-2 flex flex-col gap-1">
        {cvs.map((cv) => {
          const isSelected = cv.publicId === selectedId
          return (
            <li key={cv.publicId}>
              <button
                type="button"
                onClick={() => onSelect(cv.publicId)}
                aria-current={isSelected || undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                  isSelected ? 'bg-brand-50' : 'hover:bg-surface-sunken',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-danger-50 text-[10px] font-bold text-danger-700">
                  PDF
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      isSelected ? 'text-brand-700' : 'text-content',
                    )}
                  >
                    {cv.fileName}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-content-subtle">
                    {formatFileSize(cv.fileSize)} &middot; {formatDate(cv.createdAt)}
                    <Badge tone={PARSE_STATUS_TONE[cv.parseStatus]}>
                      {PARSE_STATUS_LABEL[cv.parseStatus]}
                    </Badge>
                    {cv.isActive && <Badge tone="brand">CV chính</Badge>}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
