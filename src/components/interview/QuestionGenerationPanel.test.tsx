import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import {
  QuestionGenerationPanel,
  type QuestionGenerationPanelProps,
} from './QuestionGenerationPanel'

import { ToastProvider } from '@/contexts/ToastProvider'
import { questionBankService } from '@/services/questionBankService'
import { bankItems, bankPage } from '@/test/questionBankFixtures'
import { generatedQuestions } from '@/test/sessionFixtures'
import type { BankItem } from '@/types/questionBank'
import { describeFromBankError, describeSaveToBankError } from '@/utils/questionBankErrors'

afterEach(() => vi.restoreAllMocks())

/** Thao tác ngân hàng của cả bộ nằm trong menu "Ngân hàng"; ở trạng thái rỗng thì là nút riêng. */
function chooseBank(name: string) {
  const menu = screen.queryByRole('button', { name: 'Ngân hàng' })
  if (menu) {
    fireEvent.click(menu)
    fireEvent.click(screen.getByRole('menuitem', { name }))
  } else {
    fireEvent.click(screen.getByRole('button', { name }))
  }
}

function openOptions() {
  fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chỉnh' }))
}

function renderPanel(overrides: Partial<QuestionGenerationPanelProps> = {}) {
  const props: QuestionGenerationPanelProps = {
    questions: [],
    isLoading: false,
    loadError: '',
    isGenerating: false,
    generateError: null,
    regeneratingId: null,
    regenerateFailure: null,
    isSaving: false,
    isReplacing: false,
    onGenerate: vi.fn(),
    onRegenerate: vi.fn(),
    onSaveToBank: vi.fn().mockResolvedValue({
      ok: true,
      result: { savedCount: 1, skippedCount: 0 },
    }),
    onReplaceFromBank: vi.fn().mockResolvedValue({ ok: true }),
    onReload: vi.fn(),
    ...overrides,
  }
  render(
    <MemoryRouter>
      <ToastProvider>
        <QuestionGenerationPanel {...props} />
      </ToastProvider>
    </MemoryRouter>,
  )
  return props
}

test('empty state generates with the default count of 5 and lets the user pick 3-10', () => {
  const props = renderPanel()
  const select = screen.getByLabelText('Số câu hỏi') as HTMLSelectElement
  expect(select.value).toBe('5')
  expect([...select.options].map((option) => option.value)).toEqual([
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Sinh câu hỏi' }))
  // "Hỗn hợp" và "Tăng dần" nghĩa là không gửi lĩnh vực và độ khó
  expect(props.onGenerate).toHaveBeenLastCalledWith({ count: 5 })

  fireEvent.change(select, { target: { value: '8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh câu hỏi' }))
  expect(props.onGenerate).toHaveBeenLastCalledWith({ count: 8 })
})

test('domain and difficulty selectors start on Hỗn hợp / Tăng dần and are sent when chosen', () => {
  const props = renderPanel()
  const domain = screen.getByLabelText('Lĩnh vực') as HTMLSelectElement
  const difficulty = screen.getByLabelText('Độ khó') as HTMLSelectElement
  expect(domain.selectedOptions[0]).toHaveTextContent('Hỗn hợp')
  expect(difficulty.selectedOptions[0]).toHaveTextContent('Tăng dần')
  expect([...domain.options].map((option) => option.value)).toEqual([
    '',
    'TECHNICAL',
    'BEHAVIORAL',
    'SITUATIONAL',
  ])
  expect([...difficulty.options].map((option) => option.value)).toEqual([
    '',
    'EASY',
    'MEDIUM',
    'HARD',
  ])

  fireEvent.change(domain, { target: { value: 'BEHAVIORAL' } })
  fireEvent.change(difficulty, { target: { value: 'HARD' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh câu hỏi' }))
  expect(props.onGenerate).toHaveBeenCalledWith({
    count: 5,
    domain: 'BEHAVIORAL',
    difficulty: 'HARD',
  })

  fireEvent.change(domain, { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh câu hỏi' }))
  expect(props.onGenerate).toHaveBeenLastCalledWith({ count: 5, difficulty: 'HARD' })
})

test('shows a spinner while the list is loading', () => {
  renderPanel({ isLoading: true })
  expect(screen.getByText('Đang tải bộ câu hỏi…')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Sinh câu hỏi' })).not.toBeInTheDocument()
})

test('load failure offers reload', () => {
  const props = renderPanel({ loadError: 'Network down' })
  expect(screen.getByRole('alert')).toHaveTextContent('Network down')
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
  expect(props.onReload).toHaveBeenCalled()
})

test('generating state warns about the wait and exposes no generate button', () => {
  renderPanel({ isGenerating: true })
  expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/mất tới khoảng 45 giây/)
  expect(screen.queryByRole('button', { name: 'Sinh câu hỏi' })).not.toBeInTheDocument()
})

test('lists questions in order with domain and difficulty labels', () => {
  renderPanel({ questions: generatedQuestions.questions })
  const items = within(screen.getByRole('list')).getAllByRole('listitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('Câu 1')
  expect(items[0]).toHaveTextContent('Kỹ thuật')
  expect(items[0]).toHaveTextContent('Trung bình')
  expect(items[1]).toHaveTextContent('Hành vi')
  expect(items[1]).toHaveTextContent('Dễ')
})

test('regenerating the whole set requires confirmation and can be cancelled', () => {
  const props = renderPanel({ questions: generatedQuestions.questions })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại' }))
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveTextContent('thay thế toàn bộ 2 câu hỏi')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
  expect(props.onGenerate).not.toHaveBeenCalled()

  expect(screen.getByText(/5 câu, hỗn hợp lĩnh vực, độ khó tăng dần/)).toBeInTheDocument()
  openOptions()
  fireEvent.change(screen.getByLabelText('Lĩnh vực'), { target: { value: 'TECHNICAL' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('Kỹ thuật')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sinh lại' }))
  expect(props.onGenerate).toHaveBeenCalledWith({ count: 5, domain: 'TECHNICAL' })
})

test('a failed regeneration keeps the old questions and says so', () => {
  renderPanel({
    questions: generatedQuestions.questions,
    generateError: { kind: 'server', message: 'AI gặp lỗi.' },
  })
  expect(screen.getByRole('alert')).toHaveTextContent('Bộ câu hỏi cũ vẫn được giữ nguyên')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})

test('CV-not-parsed error links to the CV page', () => {
  renderPanel({ generateError: { kind: 'cv-not-parsed', message: 'CV chưa được xử lý xong.' } })
  expect(screen.getByRole('alert')).toHaveTextContent('CV chưa được xử lý xong')
  expect(screen.getByRole('link')).toHaveAttribute('href', '/cvs')
})

test('each question regenerates on its own with one icon button, keeping its domain and difficulty', () => {
  const props = renderPanel({ questions: generatedQuestions.questions })
  const [first, second] = generatedQuestions.questions

  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại câu 1' }))
  expect(props.onRegenerate).toHaveBeenLastCalledWith(first.publicId, {})
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại câu 2' }))
  expect(props.onRegenerate).toHaveBeenLastCalledWith(second.publicId, {})
  // không có ô chọn riêng cho từng câu và không có hộp xác nhận của cả bộ
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('while one question regenerates only it shows progress and every conflicting control locks', () => {
  renderPanel({
    questions: generatedQuestions.questions,
    regeneratingId: generatedQuestions.questions[0].publicId,
  })
  const [first, second] = within(screen.getByRole('list')).getAllByRole('listitem')
  expect(first).toHaveAttribute('aria-busy', 'true')
  expect(within(first).getByText(/Đang sinh lại câu 1/)).toHaveTextContent(/mất tới khoảng 45 giây/)
  expect(within(second).queryByText(/Đang sinh lại câu/)).not.toBeInTheDocument()
  expect(second).not.toHaveAttribute('aria-busy')

  for (const name of [
    'Sinh lại',
    'Ngân hàng',
    'Sinh lại câu 1',
    'Sinh lại câu 2',
    'Lưu câu 1 vào ngân hàng',
  ]) {
    expect(screen.getByRole('button', { name })).toBeDisabled()
  }
})

test('a regeneration failure shows under its own question and the old text stays', () => {
  const [first, second] = generatedQuestions.questions
  renderPanel({
    questions: generatedQuestions.questions,
    regenerateFailure: {
      questionPublicId: second.publicId,
      error: { kind: 'not-found', message: 'Câu hỏi hoặc phiên không còn khả dụng.' },
    },
  })
  const [firstItem, secondItem] = within(screen.getByRole('list')).getAllByRole('listitem')
  expect(within(firstItem).queryByRole('alert')).not.toBeInTheDocument()
  expect(within(secondItem).getByRole('alert')).toHaveTextContent('Chưa sinh lại được câu 2')
  expect(within(secondItem).getByRole('alert')).toHaveTextContent('không còn khả dụng')
  expect(screen.getByText(first.content)).toBeInTheDocument()
  expect(screen.getByText(second.content)).toBeInTheDocument()
})

test('saving the whole set toasts the saved and skipped counts', async () => {
  const props = renderPanel({
    questions: generatedQuestions.questions,
    onSaveToBank: vi.fn().mockResolvedValue({
      ok: true,
      result: { savedCount: 3, skippedCount: 1 },
    }),
  })
  chooseBank('Lưu cả bộ vào ngân hàng')
  expect(props.onSaveToBank).toHaveBeenCalledWith(undefined)
  expect(await screen.findByText('Đã lưu vào ngân hàng')).toBeInTheDocument()
  expect(screen.getByText('Đã lưu 3 câu, bỏ qua 1 câu đã có.')).toBeInTheDocument()
})

test('saving one question sends only its id; nothing new to save is an info toast', async () => {
  const props = renderPanel({
    questions: generatedQuestions.questions,
    onSaveToBank: vi.fn().mockResolvedValue({
      ok: true,
      result: { savedCount: 0, skippedCount: 1 },
    }),
  })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu câu 2 vào ngân hàng' }))
  expect(props.onSaveToBank).toHaveBeenCalledWith([generatedQuestions.questions[1].publicId])
  expect(await screen.findByText('Không có câu mới để lưu')).toBeInTheDocument()
  expect(screen.getByText('Đã lưu 0 câu, bỏ qua 1 câu đã có.')).toBeInTheDocument()
  expect(screen.queryByText('Đã lưu vào ngân hàng')).not.toBeInTheDocument()
})

test('a full bank (409) says the 200 limit and how to free space, not the from-bank message', async () => {
  renderPanel({
    questions: generatedQuestions.questions,
    onSaveToBank: vi.fn().mockResolvedValue({
      ok: false,
      error: describeSaveToBankError({ status: 409, message: 'bank full' }),
    }),
  })
  chooseBank('Lưu cả bộ vào ngân hàng')
  expect(await screen.findByText('Chưa lưu được vào ngân hàng')).toBeInTheDocument()
  expect(screen.getByText(/tối đa 200 câu/)).toBeInTheDocument()
  expect(screen.getByText(/xoá bớt câu cũ/)).toBeInTheDocument()
  expect(screen.queryByText(/Phiên đã bắt đầu/)).not.toBeInTheDocument()
})

test('a blocked save (another operation running) shows no toast', async () => {
  const onSaveToBank = vi.fn().mockResolvedValue(undefined)
  renderPanel({ questions: generatedQuestions.questions, onSaveToBank })
  chooseBank('Lưu cả bộ vào ngân hàng')
  await waitFor(() => expect(onSaveToBank).toHaveBeenCalled())
  expect(screen.queryByText('Đã lưu vào ngân hàng')).not.toBeInTheDocument()
  expect(screen.queryByText('Chưa lưu được vào ngân hàng')).not.toBeInTheDocument()
})

test('every save and bank button is locked while a save is running', () => {
  renderPanel({ questions: generatedQuestions.questions, isSaving: true })
  expect(screen.getByRole('button', { name: /Ngân hàng/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Lưu câu 1 vào ngân hàng' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Sinh lại' })).toBeDisabled()
})

/** Ngân hàng giả có `count` câu, câu nào cũng khác nhau. */
function manyItems(count: number): BankItem[] {
  return Array.from({ length: count }, (_, index) => ({
    ...bankItems[0],
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    content: `Câu ngân hàng số ${index + 1}`,
  }))
}

async function openPicker(list: BankItem[] = bankItems) {
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage(list))
  chooseBank('Dùng câu từ ngân hàng')
  const dialog = screen.getByRole('dialog')
  await within(dialog).findByText(list[0].content)
  return dialog
}

function pick(dialog: HTMLElement, text: string | RegExp) {
  fireEvent.click(within(dialog).getByRole('checkbox', { name: text }))
}

test('the bank picker needs 3 questions, numbers them by selection order and sends that order', async () => {
  const props = renderPanel({ questions: generatedQuestions.questions })
  const dialog = await openPicker()
  const useButton = () => within(dialog).getByRole('button', { name: /^Dùng/ })
  expect(useButton()).toBeDisabled()

  pick(dialog, /Hệ thống chậm/) // b3 trước
  pick(dialog, /Phân biệt tiến trình/) // rồi b1
  expect(useButton()).toBeDisabled()
  expect(dialog).toHaveTextContent('Đã chọn 2/10 câu (chọn ít nhất 3)')
  pick(dialog, /Kể về lần bạn xử lý xung đột/) // cuối cùng b2
  expect(useButton()).toBeEnabled()
  expect(within(dialog).getByLabelText('Câu số 1').closest('label')).toHaveTextContent(
    'Hệ thống chậm',
  )
  expect(within(dialog).getByLabelText('Câu số 3').closest('label')).toHaveTextContent(
    'Kể về lần bạn',
  )

  fireEvent.click(useButton())
  // thao tác thay cả bộ và không hoàn tác được nên phải qua bước xác nhận
  expect(dialog).toHaveTextContent('thay thế toàn bộ 2 câu hỏi hiện tại')
  expect(dialog).toHaveTextContent('không khôi phục được')
  expect(props.onReplaceFromBank).not.toHaveBeenCalled()

  fireEvent.click(within(dialog).getByRole('button', { name: 'Thay toàn bộ bộ câu hỏi' }))
  await waitFor(() =>
    expect(props.onReplaceFromBank).toHaveBeenCalledWith([
      bankItems[2].id,
      bankItems[0].id,
      bankItems[1].id,
    ]),
  )
  expect(await screen.findByText('Đã dùng câu từ ngân hàng')).toBeInTheDocument()
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

test('unchecking a question renumbers the rest and the selection caps at 10', async () => {
  renderPanel({ questions: generatedQuestions.questions })
  const list = manyItems(11)
  const dialog = await openPicker(list)

  for (let index = 0; index < 10; index += 1)
    pick(dialog, new RegExp(`^Câu ngân hàng số ${index + 1}(?!\\d)`))
  expect(dialog).toHaveTextContent('Đã chọn 10/10 câu')
  // đủ 10 thì các câu chưa chọn bị khoá
  expect(within(dialog).getByRole('checkbox', { name: /^Câu ngân hàng số 11/ })).toBeDisabled()

  pick(dialog, /^Câu ngân hàng số 1(?![0-9])/)
  expect(dialog).toHaveTextContent('Đã chọn 9/10 câu')
  expect(within(dialog).getByRole('checkbox', { name: /^Câu ngân hàng số 11/ })).toBeEnabled()
  expect(within(dialog).getByLabelText('Câu số 1').closest('label')).toHaveTextContent('số 2')
})

test('cancelling the confirmation sends nothing and keeps the selection', async () => {
  const props = renderPanel({ questions: generatedQuestions.questions })
  const dialog = await openPicker()
  pick(dialog, /Hệ thống chậm/)
  pick(dialog, /Phân biệt tiến trình/)
  pick(dialog, /Kể về lần bạn/)
  fireEvent.click(within(dialog).getByRole('button', { name: /^Dùng/ }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Quay lại' }))
  expect(props.onReplaceFromBank).not.toHaveBeenCalled()
  expect(dialog).toHaveTextContent('Đã chọn 3/10 câu')
})

test('with no current questions there is nothing to replace, so no confirmation step', async () => {
  const props = renderPanel({ questions: [] })
  const dialog = await openPicker()
  pick(dialog, /Hệ thống chậm/)
  pick(dialog, /Phân biệt tiến trình/)
  pick(dialog, /Kể về lần bạn/)
  fireEvent.click(within(dialog).getByRole('button', { name: /^Dùng/ }))
  await waitFor(() => expect(props.onReplaceFromBank).toHaveBeenCalledTimes(1))
  expect(dialog).not.toHaveTextContent('không khôi phục được')
})

test('a from-bank 409 shows the session-started message and keeps the dialog open', async () => {
  const props = renderPanel({
    questions: generatedQuestions.questions,
    onReplaceFromBank: vi.fn().mockResolvedValue({
      ok: false,
      error: describeFromBankError({ status: 409, message: 'not CREATED' }),
    }),
  })
  const dialog = await openPicker()
  pick(dialog, /Hệ thống chậm/)
  pick(dialog, /Phân biệt tiến trình/)
  pick(dialog, /Kể về lần bạn/)
  fireEvent.click(within(dialog).getByRole('button', { name: /^Dùng/ }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Thay toàn bộ bộ câu hỏi' }))

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Phiên đã bắt đầu')
  expect(dialog).not.toHaveTextContent('tối đa 200')
  expect(props.onReplaceFromBank).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('dialog')).toBe(dialog)
  expect(dialog).toHaveTextContent('Đã chọn 3/10 câu')
  expect(screen.queryByText('Đã dùng câu từ ngân hàng')).not.toBeInTheDocument()
})

test('a from-bank 404 tells the user the current set is unchanged and reloads the list', async () => {
  renderPanel({
    questions: generatedQuestions.questions,
    onReplaceFromBank: vi.fn().mockResolvedValue({
      ok: false,
      error: describeFromBankError({ status: 404, message: 'Question bank item not found' }),
    }),
  })
  const dialog = await openPicker()
  const list = vi.mocked(questionBankService.list)
  pick(dialog, /Hệ thống chậm/)
  pick(dialog, /Phân biệt tiến trình/)
  pick(dialog, /Kể về lần bạn/)
  const before = list.mock.calls.length
  fireEvent.click(within(dialog).getByRole('button', { name: /^Dùng/ }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Thay toàn bộ bộ câu hỏi' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Bộ câu hỏi hiện tại không đổi',
  )
  await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(before))
})

test('the picker locks while replacing and a blocked call leaves it open', async () => {
  const props = renderPanel({
    questions: generatedQuestions.questions,
    onReplaceFromBank: vi.fn().mockResolvedValue(undefined),
  })
  const dialog = await openPicker()
  pick(dialog, /Hệ thống chậm/)
  pick(dialog, /Phân biệt tiến trình/)
  pick(dialog, /Kể về lần bạn/)
  fireEvent.click(within(dialog).getByRole('button', { name: /^Dùng/ }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Thay toàn bộ bộ câu hỏi' }))
  await waitFor(() => expect(props.onReplaceFromBank).toHaveBeenCalledTimes(1))
  expect(screen.getByRole('dialog')).toBe(dialog)
  expect(screen.queryByText('Đã dùng câu từ ngân hàng')).not.toBeInTheDocument()
})

test('the picker shows an empty-bank hint', async () => {
  renderPanel({ questions: [] })
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage([]))
  chooseBank('Dùng câu từ ngân hàng')
  const dialog = screen.getByRole('dialog')
  expect(await within(dialog).findByText(/Ngân hàng chưa có câu nào/)).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: /^Dùng/ })).toBeDisabled()
})
