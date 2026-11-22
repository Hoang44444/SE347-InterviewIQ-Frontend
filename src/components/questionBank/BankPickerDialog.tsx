import { useState } from 'react'

import { BankFilters } from './BankFilters'
import { BankPagination } from './BankPagination'

import { Badge, Button, Modal, Spinner, Stack } from '@/components/ui'
import { DIFFICULTY_LABEL, DIFFICULTY_TONE, DOMAIN_LABEL, DOMAIN_TONE } from '@/constants/interview'
import { BANK_PICK_MAX, BANK_PICK_MIN } from '@/constants/questionBank'
import { useQuestionBank } from '@/hooks/useQuestionBank'
import type { ReplaceFromBankOutcome } from '@/hooks/useSessionQuestions'
import { hasActiveBankFilter } from '@/services/questionBankService'
import type { BankItem } from '@/types/questionBank'
import { cn } from '@/utils/cn'

/** Số câu mỗi trang trong hộp chọn: ngắn hơn trang quản lý để hộp không quá cao. */
const PICKER_PAGE_SIZE = 8

export interface BankPickerDialogProps {
  open: boolean
  onClose: () => void
  /** Số câu hiện có trong phiên; > 0 thì phải xác nhận trước khi thay. */
  currentCount: number
  isReplacing: boolean
  /** Gọi API dùng câu từ ngân hàng. `undefined` là bị chặn (đang có thao tác khác chạy). */
  onConfirm: (itemPublicIds: string[]) => Promise<ReplaceFromBankOutcome | undefined>
}

function PickerContent({
  onClose,
  currentCount,
  isReplacing,
  onConfirm,
}: Omit<BankPickerDialogProps, 'open'>) {
  const bank = useQuestionBank({ pageSize: PICKER_PAGE_SIZE })
  const { page, filter, items, isLoading, loadError } = bank
  /** Thứ tự trong mảng chính là thứ tự chọn, cũng là thứ tự câu hỏi gửi lên backend. */
  const [selected, setSelected] = useState<BankItem[]>([])
  const [step, setStep] = useState<'pick' | 'confirm'>('pick')
  const [error, setError] = useState('')

  const isFiltering = hasActiveBankFilter(filter) || bank.searchText.trim() !== ''
  const isFull = selected.length >= BANK_PICK_MAX
  const canConfirm = selected.length >= BANK_PICK_MIN && selected.length <= BANK_PICK_MAX

  function toggle(item: BankItem) {
    setError('')
    setSelected((previous) =>
      previous.some((entry) => entry.id === item.id)
        ? previous.filter((entry) => entry.id !== item.id)
        : previous.length >= BANK_PICK_MAX
          ? previous
          : [...previous, item],
    )
  }

  async function submit() {
    const outcome = await onConfirm(selected.map((item) => item.id))
    if (!outcome) return
    if (outcome.ok) {
      onClose()
      return
    }
    // Bộ cũ không đổi khi lỗi. Quay về bước chọn để người dùng sửa lựa chọn hoặc thử lại.
    setError(outcome.error.message)
    setStep('pick')
    if (outcome.error.kind === 'not-found') bank.reload()
  }

  function proceed() {
    setError('')
    if (currentCount > 0) setStep('confirm')
    else void submit()
  }

  if (step === 'confirm') {
    return (
      <Stack gap="md">
        <p className="text-sm text-content-muted">
          Thao tác này thay thế toàn bộ{' '}
          <strong className="text-content">{currentCount} câu hỏi hiện tại</strong> bằng{' '}
          <strong className="text-content">{selected.length} câu</strong> bạn đã chọn, theo đúng thứ
          tự chọn. Bộ cũ không khôi phục được.
        </p>
        <ol className="flex flex-col gap-2 text-sm text-content">
          {selected.map((item, index) => (
            <li key={item.id} className="flex gap-2">
              <span className="font-semibold text-content-subtle">{index + 1}.</span>
              <span className="min-w-0 wrap-anywhere">{item.content}</span>
            </li>
          ))}
        </ol>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setStep('pick')} disabled={isReplacing}>
            Quay lại
          </Button>
          <Button variant="danger" onClick={() => void submit()} isLoading={isReplacing}>
            Thay toàn bộ bộ câu hỏi
          </Button>
        </div>
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      <BankFilters
        idPrefix="picker"
        filter={filter}
        searchText={bank.searchText}
        onDomainChange={bank.setDomain}
        onDifficultyChange={bank.setDifficulty}
        onSearchChange={bank.setSearchText}
        onClear={bank.clearFilter}
        canClear={isFiltering}
      />

      {error && (
        <p role="alert" className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}
      {loadError && (
        <Stack gap="sm">
          <p
            role="alert"
            className="rounded-control bg-warning-50 px-3 py-2 text-sm text-warning-700"
          >
            Chưa tải được ngân hàng: {loadError}
          </p>
          <Button variant="secondary" size="sm" className="self-start" onClick={bank.reload}>
            Tải lại
          </Button>
        </Stack>
      )}

      {isLoading ? (
        <div
          role="status"
          aria-label="Đang tải ngân hàng câu hỏi"
          className="flex justify-center py-8"
        >
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {!loadError && items.length === 0 && (
            <p className="rounded-card bg-surface-muted px-4 py-6 text-center text-sm text-content-muted">
              {isFiltering
                ? 'Không có câu nào khớp bộ lọc.'
                : page && page.currentPage > 1
                  ? 'Trang này không có câu hỏi. Hãy chọn trang trước.'
                  : 'Ngân hàng chưa có câu nào. Hãy lưu câu hỏi vào ngân hàng trước.'}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const position = selected.findIndex((entry) => entry.id === item.id) + 1
              const isChecked = position > 0
              const inputId = `picker-item-${item.id}`
              return (
                <li key={item.id}>
                  <label
                    htmlFor={inputId}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-card border bg-surface p-3',
                      isChecked ? 'border-brand-400 bg-brand-50' : 'border-border',
                      !isChecked && isFull && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      className="mt-1 size-4 accent-brand-600"
                      checked={isChecked}
                      disabled={(!isChecked && isFull) || isReplacing}
                      onChange={() => toggle(item)}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="wrap-anywhere text-content">{item.content}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge tone={DOMAIN_TONE[item.domain]}>{DOMAIN_LABEL[item.domain]}</Badge>
                        <Badge tone={DIFFICULTY_TONE[item.difficulty]}>
                          {DIFFICULTY_LABEL[item.difficulty]}
                        </Badge>
                      </span>
                    </span>
                    {isChecked && (
                      <span
                        aria-label={`Câu số ${position}`}
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
                      >
                        {position}
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {page && (
        <BankPagination
          label="Phân trang chọn câu từ ngân hàng"
          page={page}
          disabled={isLoading || !!loadError || isReplacing}
          onChange={bank.changePage}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p role="status" className="text-sm text-content-muted">
          Đã chọn <strong className="text-content">{selected.length}</strong>/{BANK_PICK_MAX} câu
          {selected.length < BANK_PICK_MIN && ` (chọn ít nhất ${BANK_PICK_MIN})`}. Thứ tự chọn là
          thứ tự câu hỏi.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isReplacing}>
            Huỷ
          </Button>
          <Button onClick={proceed} disabled={!canConfirm} isLoading={isReplacing}>
            Dùng {selected.length > 0 ? `${selected.length} câu` : 'câu đã chọn'}
          </Button>
        </div>
      </div>
    </Stack>
  )
}

/**
 * Hộp chọn câu từ ngân hàng cho phiên. Nội dung chỉ được dựng khi hộp mở, nên
 * danh sách tự tải lại mỗi lần mở và trạng thái chọn không dính sang lần sau.
 */
export function BankPickerDialog({ open, onClose, ...rest }: BankPickerDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dùng câu từ ngân hàng"
      description={`Chọn ${BANK_PICK_MIN} đến ${BANK_PICK_MAX} câu. Bộ câu hỏi của phiên sẽ được thay bằng các câu này.`}
      size="lg"
      dismissible={!rest.isReplacing}
    >
      {open && <PickerContent onClose={onClose} {...rest} />}
    </Modal>
  )
}
