import { Badge, Button, Card } from '@/components/ui'
import { DIFFICULTY_LABEL, DIFFICULTY_TONE, DOMAIN_LABEL, DOMAIN_TONE } from '@/constants/interview'
import type { BankItem } from '@/types/questionBank'
import { formatDate } from '@/utils/format'

export interface BankItemRowProps {
  item: BankItem
  /** Khoá nút xoá của câu này khi đang xoá (hoặc đang xoá câu khác). */
  isDeleteDisabled: boolean
  isDeleting: boolean
  onDelete: (item: BankItem) => void
}

/** Một câu trong trang quản lý ngân hàng. Chỉ xoá được, không sửa nội dung (API không có). */
export function BankItemRow({ item, isDeleteDisabled, isDeleting, onDelete }: BankItemRowProps) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-medium wrap-anywhere text-content">{item.content}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={DOMAIN_TONE[item.domain]}>{DOMAIN_LABEL[item.domain]}</Badge>
            <Badge tone={DIFFICULTY_TONE[item.difficulty]}>
              {DIFFICULTY_LABEL[item.difficulty]}
            </Badge>
            <span className="text-sm text-content-subtle">
              Lưu ngày {formatDate(item.createdAt)}
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDelete(item)}
          disabled={isDeleteDisabled}
          isLoading={isDeleting}
          aria-label={`Xoá câu: ${item.content}`}
        >
          Xoá
        </Button>
      </div>
    </Card>
  )
}
