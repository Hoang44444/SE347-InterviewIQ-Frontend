import { Button, Input, Select, Stack } from '@/components/ui'
import {
  BANK_SEARCH_MAX_LENGTH,
  DIFFICULTY_FILTER_OPTIONS,
  DOMAIN_FILTER_OPTIONS,
} from '@/constants/questionBank'
import type { QuestionDifficulty, QuestionDomain } from '@/types/interview'
import type { BankFilter } from '@/types/questionBank'
import { cn } from '@/utils/cn'

export interface BankFiltersProps {
  filter: BankFilter
  /** Nội dung ô tìm kiếm đang gõ; có thể đi trước `filter.search` vì debounce. */
  searchText: string
  onDomainChange: (domain: QuestionDomain | '') => void
  onDifficultyChange: (difficulty: QuestionDifficulty | '') => void
  onSearchChange: (text: string) => void
  onClear: () => void
  canClear: boolean
  /** Tiền tố id để hai bộ lọc cùng xuất hiện trên một trang không trùng id. */
  idPrefix?: string
  /** Bố cục hai cột cho chỗ hẹp như hộp chọn câu. */
  compact?: boolean
}

/**
 * Thanh lọc ngân hàng. Chỉ có ba ô vì backend chỉ nhận ba tham số đó (lĩnh
 * vực, độ khó, tìm theo nội dung); không dựng thêm ô mà API không hỗ trợ.
 */
export function BankFilters({
  filter,
  searchText,
  onDomainChange,
  onDifficultyChange,
  onSearchChange,
  onClear,
  canClear,
  idPrefix = 'bank',
  compact = false,
}: BankFiltersProps) {
  return (
    <div
      className={cn(
        'grid gap-3',
        compact
          ? 'grid-cols-2 items-start'
          : 'sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-start',
      )}
    >
      <Select
        id={`${idPrefix}-domain`}
        label="Lĩnh vực"
        options={DOMAIN_FILTER_OPTIONS}
        value={filter.domain}
        onChange={(event) => onDomainChange(event.target.value as QuestionDomain | '')}
      />
      <Select
        id={`${idPrefix}-difficulty`}
        label="Độ khó"
        options={DIFFICULTY_FILTER_OPTIONS}
        value={filter.difficulty}
        onChange={(event) => onDifficultyChange(event.target.value as QuestionDifficulty | '')}
      />
      <div className={cn(compact && 'col-span-2')}>
        <Input
          id={`${idPrefix}-search`}
          type="search"
          label="Tìm trong nội dung"
          placeholder="Nhập từ khoá…"
          maxLength={BANK_SEARCH_MAX_LENGTH}
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      {/* Đệm trên cho thẳng hàng với ô nhập, vì ba ô kia có nhãn ở trên. */}
      <Stack gap="xs" className={cn(compact ? 'col-span-2' : 'lg:pt-6')}>
        <Button variant="secondary" onClick={onClear} disabled={!canClear}>
          Xoá lọc
        </Button>
      </Stack>
    </div>
  )
}
