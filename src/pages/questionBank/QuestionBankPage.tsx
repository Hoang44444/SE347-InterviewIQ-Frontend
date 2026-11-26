import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BankFilters, BankItemRow, BankPagination } from '@/components/questionBank'
import { Button, Card, EmptyState, Modal, PageHeader, Spinner, Stack } from '@/components/ui'
import { BANK_MAX_ITEMS } from '@/constants/questionBank'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useQuestionBank } from '@/hooks/useQuestionBank'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import { hasActiveBankFilter } from '@/services/questionBankService'
import type { BankItem } from '@/types/questionBank'

/** Trang quản lý ngân hàng câu hỏi: xem, lọc, tìm và xoá. Câu chỉ vào ngân hàng khi người dùng lưu. */
export function QuestionBankPage() {
  useDocumentTitle('Ngân hàng câu hỏi')
  const navigate = useNavigate()
  const toast = useToast()
  const bank = useQuestionBank()
  const { page, filter, items, isLoading, loadError, deletingId } = bank
  const [pendingDelete, setPendingDelete] = useState<BankItem | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const isFiltering = hasActiveBankFilter(filter) || bank.searchText.trim() !== ''
  /** Chưa có câu nào, khác với "trang này rỗng" hay "lọc không ra gì". */
  const isEmptyBank = !isFiltering && items.length === 0 && !page?.hasNext && !page?.hasPrevious
  const isDeleting = deletingId !== null

  function askDelete(item: BankItem) {
    setDeleteError('')
    setPendingDelete(item)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const result = await bank.remove(pendingDelete)
    if (!result) return
    if (result.ok) {
      toast.success('Đã xoá khỏi ngân hàng', pendingDelete.content)
      setPendingDelete(null)
    } else {
      setDeleteError(result.error.message)
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="Ngân hàng câu hỏi"
        description={`Các câu hỏi bạn đã lưu để dùng lại, mới nhất trước. Mỗi người lưu tối đa ${BANK_MAX_ITEMS} câu.`}
        actions={
          <Button variant="secondary" onClick={() => navigate(ROUTES.interviews)}>
            Phòng phỏng vấn
          </Button>
        }
      />

      <Card>
        <BankFilters
          filter={filter}
          searchText={bank.searchText}
          onDomainChange={bank.setDomain}
          onDifficultyChange={bank.setDifficulty}
          onSearchChange={bank.setSearchText}
          onClear={bank.clearFilter}
          canClear={isFiltering}
        />
      </Card>

      {loadError && (
        <Stack gap="sm">
          <p role="alert" className="rounded-card bg-warning-50 px-4 py-3 text-sm text-warning-700">
            Chưa tải được ngân hàng: {loadError}
          </p>
          <Button variant="secondary" className="self-start" onClick={bank.reload}>
            Tải lại
          </Button>
        </Stack>
      )}

      {isLoading ? (
        <div
          role="status"
          aria-label="Đang tải ngân hàng câu hỏi"
          className="flex justify-center py-16"
        >
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {!loadError && items.length === 0 && (
            <EmptyState
              title={
                isEmptyBank
                  ? 'Ngân hàng chưa có câu nào'
                  : isFiltering
                    ? 'Không có câu nào khớp bộ lọc'
                    : 'Trang này không có câu hỏi'
              }
              description={
                isEmptyBank
                  ? 'Sinh câu hỏi trong một phòng phỏng vấn, rồi bấm "Lưu vào ngân hàng" để dùng lại sau.'
                  : isFiltering
                    ? 'Thử đổi từ khoá hoặc bỏ lọc lĩnh vực, độ khó.'
                    : 'Chọn trang trước để xem các câu khác.'
              }
              action={
                isEmptyBank ? (
                  <Button onClick={() => navigate(ROUTES.interviews)}>Tới phòng phỏng vấn</Button>
                ) : isFiltering ? (
                  <Button variant="secondary" onClick={bank.clearFilter}>
                    Bỏ lọc để xem tất cả
                  </Button>
                ) : undefined
              }
            />
          )}

          <Stack gap="sm">
            {items.map((item) => (
              <BankItemRow
                key={item.id}
                item={item}
                onDelete={askDelete}
                isDeleting={deletingId === item.id}
                isDeleteDisabled={isDeleting}
              />
            ))}
          </Stack>
        </>
      )}

      {page && (
        <BankPagination
          page={page}
          disabled={isLoading || !!loadError || isDeleting}
          onChange={bank.changePage}
        />
      )}

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Xoá câu hỏi khỏi ngân hàng?"
        size="sm"
        dismissible={!isDeleting}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              Huỷ
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} isLoading={isDeleting}>
              Xoá câu hỏi
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-content-muted">
          <p className="wrap-anywhere font-medium text-content">{pendingDelete?.content}</p>
          <p>Câu này bị xoá khỏi ngân hàng và không khôi phục được.</p>
          <p>Các phiên đã dùng câu này vẫn giữ nguyên câu hỏi của mình.</p>
          {deleteError && (
            <p role="alert" className="rounded-control bg-danger-50 px-3 py-2 text-danger-700">
              {deleteError}
            </p>
          )}
        </div>
      </Modal>
    </Stack>
  )
}
