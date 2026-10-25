import { useNavigate } from 'react-router-dom'

import { HistoryFilters, HistoryRow } from '@/components/history'
import { Button, EmptyState, PageHeader, Spinner, Stack } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useInterviewHistory } from '@/hooks/useInterviewHistory'
import { ROUTES } from '@/routes/paths'
import { hasActiveFilter } from '@/services/interviewHistoryService'
import { isRangeReversed } from '@/utils/dateRange'

const RANGE_ERROR = '"Từ ngày" phải trước hoặc bằng "Đến ngày"'

export function HistoryPage() {
  useDocumentTitle('Lịch sử phỏng vấn')
  const navigate = useNavigate()
  const history = useInterviewHistory()
  const { page, filter, items, isLoading, loadError } = history

  const rangeError = isRangeReversed(filter.fromDate, filter.toDate) ? RANGE_ERROR : ''
  const isFiltering = hasActiveFilter(filter)
  /** Tài khoản chưa có buổi nào, khác với "trang này rỗng" hay "lọc không ra gì". */
  const isEmptyAccount = !isFiltering && items.length === 0 && !page?.hasNext && !page?.hasPrevious

  return (
    <Stack gap="lg">
      <PageHeader
        title="Lịch sử phỏng vấn"
        description="Toàn bộ buổi luyện tập của bạn, mới nhất trước."
        actions={
          <Button variant="secondary" onClick={() => navigate(ROUTES.interviews)}>
            Phòng phỏng vấn
          </Button>
        }
      />

      <HistoryFilters
        filter={filter}
        onChange={history.applyFilter}
        onClear={history.clearFilter}
        rangeError={rangeError}
        canClear={isFiltering}
      />

      {/* Khoảng ngày đảo chiều đã hiện ngay dưới ô nhập, không nhắc lại ở đây. */}
      {loadError && !rangeError && (
        <Stack gap="sm">
          <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
            Chưa tải được lịch sử: {loadError}
          </p>
          <Button variant="secondary" className="self-start" onClick={history.reload}>
            Tải lại
          </Button>
        </Stack>
      )}

      {isLoading ? (
        <div role="status" aria-label="Đang tải lịch sử" className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {!loadError && items.length === 0 && (
            <EmptyState
              title={
                isEmptyAccount
                  ? 'Chưa có buổi phỏng vấn nào'
                  : isFiltering
                    ? 'Không có buổi nào khớp bộ lọc'
                    : 'Trang này không có buổi phỏng vấn'
              }
              description={
                isEmptyAccount
                  ? 'Hoàn thành buổi luyện tập đầu tiên để thấy kết quả ở đây.'
                  : isFiltering
                    ? 'Thử nới khoảng thời gian hoặc bỏ lọc trạng thái.'
                    : 'Chọn trang trước để xem các buổi phỏng vấn khác.'
              }
              action={
                isEmptyAccount ? (
                  <Button onClick={() => navigate(ROUTES.interviews)}>Tạo buổi phỏng vấn</Button>
                ) : isFiltering ? (
                  <Button variant="secondary" onClick={history.clearFilter}>
                    Bỏ lọc để xem tất cả
                  </Button>
                ) : undefined
              }
            />
          )}

          <Stack gap="sm">
            {items.map((item) => (
              <HistoryRow key={item.id} item={item} />
            ))}
          </Stack>
        </>
      )}

      {page && (
        <nav
          aria-label="Phân trang lịch sử phỏng vấn"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-content-muted">
            Trang {page.currentPage} / {Math.max(1, page.totalPages)}
          </p>
          <Stack direction="row" gap="sm">
            <Button
              variant="secondary"
              disabled={!page.hasPrevious || isLoading || !!loadError}
              onClick={() => history.changePage(page.currentPage - 1)}
            >
              Trang trước
            </Button>
            <Button
              variant="secondary"
              disabled={!page.hasNext || isLoading || !!loadError}
              onClick={() => history.changePage(page.currentPage + 1)}
            >
              Trang sau
            </Button>
          </Stack>
        </nav>
      )}
    </Stack>
  )
}
