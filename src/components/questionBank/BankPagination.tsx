import { Button, Stack } from '@/components/ui'
import type { BankPage } from '@/types/questionBank'

export interface BankPaginationProps {
  page: BankPage
  disabled: boolean
  onChange: (pageNumber: number) => void
  label?: string
}

export function BankPagination({
  page,
  disabled,
  onChange,
  label = 'Phân trang ngân hàng câu hỏi',
}: BankPaginationProps) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-content-muted">
        Trang {page.currentPage} / {Math.max(1, page.totalPages)}
      </p>
      <Stack direction="row" gap="sm">
        <Button
          variant="secondary"
          disabled={!page.hasPrevious || disabled}
          onClick={() => onChange(page.currentPage - 1)}
        >
          Trang trước
        </Button>
        <Button
          variant="secondary"
          disabled={!page.hasNext || disabled}
          onClick={() => onChange(page.currentPage + 1)}
        >
          Trang sau
        </Button>
      </Stack>
    </nav>
  )
}
