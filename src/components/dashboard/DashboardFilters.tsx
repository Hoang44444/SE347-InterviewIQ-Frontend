import { Button, Card, Input, Stack } from '@/components/ui'
import type { DashboardDateRange } from '@/types/dashboard'

export interface DashboardFiltersProps {
  range: DashboardDateRange
  onChange: (next: DashboardDateRange) => void
  onClear: () => void
  /** Lỗi khoảng ngày, hiện ngay dưới ô "Đến ngày". */
  rangeError?: string
  /** Đang có lọc: mở nút xoá lọc và nhắc phạm vi của khoảng ngày. */
  isFiltered?: boolean
}

/**
 * Khoảng ngày cho số liệu của dashboard.
 *
 * Chỉ có hai ô ngày vì GET /interviews/stats chỉ nhận fromDate/toDate. Không
 * vẽ thêm ô lọc trạng thái như màn lịch sử: thống kê chỉ tính buổi đã chấm xong,
 * nên lọc trạng thái ở đây sẽ là ô chết.
 */
export function DashboardFilters({
  range,
  onChange,
  onClear,
  rangeError,
  isFiltered = false,
}: DashboardFiltersProps) {
  return (
    <Card>
      {/* max-w: chỉ có hai ô ngày, để tràn cả bề ngang card thì ô date rộng vô lý. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-[1fr_1fr_auto] lg:items-start">
        <Input
          type="date"
          label="Từ ngày"
          value={range.fromDate}
          // Chặn ở trình duyệt luôn, đỡ phải sửa sau khi thấy lỗi.
          max={range.toDate || undefined}
          onChange={(event) => onChange({ ...range, fromDate: event.target.value })}
        />
        <Input
          type="date"
          label="Đến ngày"
          value={range.toDate}
          min={range.fromDate || undefined}
          error={rangeError}
          onChange={(event) => onChange({ ...range, toDate: event.target.value })}
        />
        {/* Đệm trên cho thẳng hàng với ô nhập, vì hai ô kia có nhãn ở trên. */}
        <Stack gap="xs" className="lg:pt-6">
          <Button variant="secondary" onClick={onClear} disabled={!isFiltered}>
            Xoá lọc
          </Button>
        </Stack>
      </div>

      {isFiltered && (
        <p className="mt-3 text-sm text-content-muted">
          Khoảng ngày chỉ áp dụng cho số liệu và hai biểu đồ. Nhận xét của AI luôn dựa trên toàn bộ
          lịch sử.
        </p>
      )}
    </Card>
  )
}
