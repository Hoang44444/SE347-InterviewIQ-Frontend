import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { QuestionBankPage } from './QuestionBankPage'

import { BANK_SEARCH_DEBOUNCE_MS } from '@/constants/questionBank'
import { ToastProvider } from '@/contexts/ToastProvider'
import { questionBankService } from '@/services/questionBankService'
import { deferred } from '@/test/interviewFixtures'
import { bankItems, bankPage } from '@/test/questionBankFixtures'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function renderPage() {
  render(
    <MemoryRouter>
      <ToastProvider>
        <QuestionBankPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

test('shows a spinner then the items with domain, difficulty and date', async () => {
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  renderPage()
  expect(screen.getByRole('status', { name: 'Đang tải ngân hàng câu hỏi' })).toBeInTheDocument()

  expect(await screen.findByText(bankItems[0].content)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /^Xoá câu:/ })).toHaveLength(4)
  expect(screen.getByText(bankItems[2].content).closest('div')).toHaveTextContent('Tình huống')
  expect(screen.getByText(bankItems[2].content).closest('div')).toHaveTextContent('Khó')
  // không có nút sửa nội dung: API không hỗ trợ
  expect(screen.queryByRole('button', { name: /Sửa/ })).not.toBeInTheDocument()
})

test('an empty bank explains how to fill it', async () => {
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage([]))
  renderPage()
  expect(await screen.findByText('Ngân hàng chưa có câu nào')).toBeInTheDocument()
  expect(screen.getByText(/Lưu vào ngân hàng/)).toBeInTheDocument()
})

test('a load error offers a reload and keeps working after it', async () => {
  const list = vi
    .spyOn(questionBankService, 'list')
    .mockRejectedValueOnce({ status: 500, message: 'boom' })
    .mockResolvedValue(bankPage())
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
  expect(await screen.findByText(bankItems[0].content)).toBeInTheDocument()
  expect(list).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('filters by domain and difficulty, sending only chosen values, and clears them', async () => {
  const list = vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  renderPage()
  await screen.findByText(bankItems[0].content)
  expect(screen.getByRole('button', { name: 'Xoá lọc' })).toBeDisabled()

  fireEvent.change(screen.getByLabelText('Lĩnh vực'), { target: { value: 'TECHNICAL' } })
  await waitFor(() =>
    expect(list).toHaveBeenLastCalledWith(
      1,
      { domain: 'TECHNICAL', difficulty: '', search: '' },
      expect.any(Number),
    ),
  )
  fireEvent.change(screen.getByLabelText('Độ khó'), { target: { value: 'EASY' } })
  await waitFor(() =>
    expect(list).toHaveBeenLastCalledWith(
      1,
      { domain: 'TECHNICAL', difficulty: 'EASY', search: '' },
      expect.any(Number),
    ),
  )

  fireEvent.click(await screen.findByRole('button', { name: 'Xoá lọc' }))
  await waitFor(() =>
    expect(list).toHaveBeenLastCalledWith(
      1,
      { domain: '', difficulty: '', search: '' },
      expect.any(Number),
    ),
  )
  expect(screen.getByLabelText('Lĩnh vực')).toHaveValue('')
})

test('searching waits for the user to stop typing', async () => {
  const list = vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  renderPage()
  await screen.findByText(bankItems[0].content)
  vi.useFakeTimers()

  const box = screen.getByLabelText('Tìm trong nội dung')
  fireEvent.change(box, { target: { value: 'lu' } })
  fireEvent.change(box, { target: { value: 'luồng' } })
  expect(list).toHaveBeenCalledTimes(1)
  await act(async () => {
    vi.advanceTimersByTime(BANK_SEARCH_DEBOUNCE_MS)
  })
  expect(list).toHaveBeenCalledTimes(2)
  expect(list).toHaveBeenLastCalledWith(
    1,
    { domain: '', difficulty: '', search: 'luồng' },
    expect.any(Number),
  )
})

test('a filter with no match says so and offers to clear it', async () => {
  vi.spyOn(questionBankService, 'list')
    .mockResolvedValueOnce(bankPage())
    .mockResolvedValue(bankPage([]))
  renderPage()
  await screen.findByText(bankItems[0].content)
  fireEvent.change(screen.getByLabelText('Lĩnh vực'), { target: { value: 'SITUATIONAL' } })
  expect(await screen.findByText('Không có câu nào khớp bộ lọc')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bỏ lọc để xem tất cả' })).toBeInTheDocument()
})

test('paginates with previous and next and disables the edges', async () => {
  const list = vi
    .spyOn(questionBankService, 'list')
    .mockImplementation(async (pageNumber = 1) => bankPage(bankItems, pageNumber, 2))
  renderPage()
  await screen.findByText(bankItems[0].content)
  expect(screen.getByText('Trang 1 / 2')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  await screen.findByText('Trang 2 / 2')
  expect(list).toHaveBeenLastCalledWith(2, expect.anything(), expect.any(Number))
  expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()

  fireEvent.click(screen.getByRole('button', { name: 'Trang trước' }))
  await screen.findByText('Trang 1 / 2')
})

test('delete asks for confirmation first and cancel sends nothing', async () => {
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  const remove = vi.spyOn(questionBankService, 'remove').mockResolvedValue()
  renderPage()
  await screen.findByText(bankItems[0].content)

  fireEvent.click(screen.getAllByRole('button', { name: /^Xoá câu:/ })[0])
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveTextContent('không khôi phục được')
  expect(dialog).toHaveTextContent(bankItems[0].content)
  fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
  expect(remove).not.toHaveBeenCalled()
})

test('confirming a delete sends one request even on a double click, then toasts and reloads', async () => {
  const list = vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  const pending = deferred<void>()
  const remove = vi.spyOn(questionBankService, 'remove').mockReturnValue(pending.promise)
  renderPage()
  await screen.findByText(bankItems[0].content)

  fireEvent.click(screen.getAllByRole('button', { name: /^Xoá câu:/ })[1])
  const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá câu hỏi' })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  expect(remove).toHaveBeenCalledTimes(1)
  expect(remove).toHaveBeenCalledWith(bankItems[1].id)
  // đang xoá thì khoá luôn nút xoá của các câu khác
  for (const button of screen.getAllByRole('button', { name: /^Xoá câu:/ })) {
    expect(button).toBeDisabled()
  }

  await act(async () => pending.resolve())
  expect(await screen.findByText('Đã xoá khỏi ngân hàng')).toBeInTheDocument()
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
})

test('a failed delete keeps the dialog open with the error so the user can retry', async () => {
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  const remove = vi
    .spyOn(questionBankService, 'remove')
    .mockRejectedValueOnce({ status: 500, message: 'x' })
    .mockResolvedValue()
  renderPage()
  await screen.findByText(bankItems[0].content)

  fireEvent.click(screen.getAllByRole('button', { name: /^Xoá câu:/ })[0])
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá câu hỏi' }))
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
    'Máy chủ đang gặp sự cố',
  )
  // danh sách vẫn nguyên
  expect(screen.getAllByRole('button', { name: /^Xoá câu:/ })).toHaveLength(4)

  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá câu hỏi' }))
  await waitFor(() => expect(remove).toHaveBeenCalledTimes(2))
})
