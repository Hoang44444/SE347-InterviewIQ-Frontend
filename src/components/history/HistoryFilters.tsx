import { Button, Card, Input, Select, Stack } from '@/components/ui'
import { STATUS_FILTER_OPTIONS } from '@/constants/history'
import type { InterviewHistoryFilter } from '@/types/history'
import type { InterviewSessionStatus } from '@/types/interview'

export interface HistoryFiltersProps {
  filter: InterviewHistoryFilter
  onChange: (next: InterviewHistoryFilter) => void
  onClear: () => void
  /** Lỗi khoảng ngày, hiện ngay dưới ô "Đến ngày". */
  rangeError?: string
  /** Còn đang tải thì vẫn cho đổi lọc, chỉ khoá nút xoá lọc khi không có gì để xoá. */
  canClear?: boolean
}

/**
 * Thanh lọc của màn lịch sử.
 *
 * Chỉ có đúng ba ô vì backend chỉ nhận ba tham số đó. Không vẽ ô tìm theo từ
 * khoá hay lọc theo khoảng điểm: API chưa hỗ trợ, dựng ra sẽ thành ô chết.
 */
export function HistoryFilters({
  filter,
  onChange,
  onClear,
  rangeError,
  canClear = false,
}: HistoryFiltersProps) {
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
        <Select
          label="Trạng thái"
          options={STATUS_FILTER_OPTIONS}
          value={filter.status}
          onChange={(event) =>
            onChange({
              ...filter,
              status: event.target.value as InterviewSessionStatus | '',
            })
          }
        />
        <Input
          type="date"
          label="Từ ngày"
          value={filter.fromDate}
          // Chặn ở trình duyệt luôn, đỡ phải sửa sau khi thấy lỗi.
          max={filter.toDate || undefined}
          onChange={(event) => onChange({ ...filter, fromDate: event.target.value })}
        />
        <Input
          type="date"
          label="Đến ngày"
          value={filter.toDate}
          min={filter.fromDate || undefined}
          error={rangeError}
          onChange={(event) => onChange({ ...filter, toDate: event.target.value })}
        />
        {/* Đệm trên cho thẳng hàng với ô nhập, vì ba ô kia có nhãn ở trên. */}
        <Stack gap="xs" className="lg:pt-6">
          <Button variant="secondary" onClick={onClear} disabled={!canClear}>
            Xoá lọc
          </Button>
        </Stack>
      </div>
    </Card>
  )
}
