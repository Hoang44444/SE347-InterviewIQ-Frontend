import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { CreatedSessionContent } from './CreatedSessionContent'

import { ToastProvider } from '@/contexts/ToastProvider'
import { interviewService } from '@/services/interviewService'
import { questionBankService } from '@/services/questionBankService'
import { deferred } from '@/test/interviewFixtures'
import { bankItems, bankPage } from '@/test/questionBankFixtures'
import { generatedQuestions, session } from '@/test/sessionFixtures'
import type { SessionQuestions } from '@/types/interview'

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

const [first, second] = generatedQuestions.questions
const sessionId = session.sessionPublicId

function renderContent() {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  render(
    <MemoryRouter>
      <ToastProvider>
        <CreatedSessionContent
          session={session}
          onStart={vi.fn()}
          isStarting={false}
          startDisabled={false}
        />
      </ToastProvider>
    </MemoryRouter>,
  )
}

async function loaded() {
  await screen.findByText(first.content)
}

test('regenerating one question sends one request on a double click and locks Start meanwhile', async () => {
  renderContent()
  await loaded()
  const pending = deferred<SessionQuestions>()
  const regenerate = vi
    .spyOn(interviewService, 'regenerateQuestion')
    .mockReturnValue(pending.promise)

  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại câu 1' }))
  fireEvent.click(screen.getByRole('button', { name: /Sinh lại câu 1/ }))
  fireEvent.click(screen.getByRole('button', { name: /Sinh lại câu 2/ }))
  expect(regenerate).toHaveBeenCalledTimes(1)
  expect(regenerate).toHaveBeenCalledWith(sessionId, first.publicId, {})
  expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled()
  expect(screen.getByRole('button', { name: /Sinh lại câu 2/ })).toBeDisabled()

  const rewritten = { ...first, content: 'Câu đã được viết lại.' }
  await act(async () =>
    pending.resolve({ sessionPublicId: sessionId, questions: [rewritten, second] }),
  )
  expect(await screen.findByText('Câu đã được viết lại.')).toBeInTheDocument()
  expect(screen.queryByText(first.content)).not.toBeInTheDocument()
  expect(screen.getByText(second.content)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeEnabled()
})

test('a failed single regeneration keeps every old question and explains the 500', async () => {
  renderContent()
  await loaded()
  vi.spyOn(interviewService, 'regenerateQuestion').mockRejectedValue({
    status: 500,
    message: 'Failed to regenerate',
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại câu 2' }))

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Chưa sinh lại được câu 2')
  expect(alert).toHaveTextContent('Câu cũ được giữ nguyên')
  expect(screen.getByText(first.content)).toBeInTheDocument()
  expect(screen.getByText(second.content)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sinh lại câu 2' })).toBeEnabled()
})

test('a 404 on regenerate says the question or session is gone, not the generate message', async () => {
  renderContent()
  await loaded()
  vi.spyOn(interviewService, 'regenerateQuestion').mockRejectedValue({
    status: 404,
    message: 'Interview question not found or unavailable',
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại câu 1' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Câu hỏi hoặc phiên không còn khả dụng',
  )
})

test('a 409 on regenerate for an unparsed CV links to the CV page', async () => {
  renderContent()
  await loaded()
  vi.spyOn(interviewService, 'regenerateQuestion').mockRejectedValue({
    status: 409,
    message: 'CV has not been parsed yet',
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại câu 1' }))
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('CV chưa được xử lý xong')
  expect(within(alert).getByRole('link')).toHaveAttribute('href', '/cvs')
})

test('a 400 on regenerate asks the user to choose domain and difficulty again', async () => {
  renderContent()
  await loaded()
  vi.spyOn(interviewService, 'regenerateQuestion').mockRejectedValue({
    status: 400,
    message: 'domain must be one of',
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại câu 1' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('không hợp lệ')
})

test('generating the set sends the chosen domain and difficulty', async () => {
  renderContent()
  await loaded()
  const generate = vi
    .spyOn(interviewService, 'generateQuestions')
    .mockResolvedValue(generatedQuestions)
  openOptions()
  fireEvent.change(screen.getByLabelText('Lĩnh vực'), { target: { value: 'TECHNICAL' } })
  fireEvent.change(screen.getByLabelText('Độ khó'), { target: { value: 'EASY' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sinh lại' }))
  await waitFor(() =>
    expect(generate).toHaveBeenCalledWith(sessionId, {
      count: 5,
      domain: 'TECHNICAL',
      difficulty: 'EASY',
    }),
  )
})

test('saving to the bank shows the real counts, and a full bank shows the 200 limit', async () => {
  renderContent()
  await loaded()
  const save = vi
    .spyOn(questionBankService, 'saveFromSession')
    .mockResolvedValueOnce({ savedCount: 1, skippedCount: 1 })
    .mockRejectedValueOnce({ status: 409, message: 'Question bank is full' })

  chooseBank('Lưu cả bộ vào ngân hàng')
  expect(await screen.findByText('Đã lưu 1 câu, bỏ qua 1 câu đã có.')).toBeInTheDocument()
  expect(save).toHaveBeenCalledWith({ sessionPublicId: sessionId })

  fireEvent.click(screen.getByRole('button', { name: 'Lưu câu 2 vào ngân hàng' }))
  expect(await screen.findByText(/tối đa 200 câu/)).toBeInTheDocument()
  expect(save).toHaveBeenLastCalledWith({
    sessionPublicId: sessionId,
    questionPublicIds: [second.publicId],
  })
  // lưu lỗi không đụng tới bộ câu hỏi
  expect(screen.getByText(first.content)).toBeInTheDocument()
})

test('saving ignores a second click while the first request is in flight', async () => {
  renderContent()
  await loaded()
  const pending = deferred<{ savedCount: number; skippedCount: number }>()
  const save = vi.spyOn(questionBankService, 'saveFromSession').mockReturnValue(pending.promise)
  const button = screen.getByRole('button', { name: 'Lưu câu 1 vào ngân hàng' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(save).toHaveBeenCalledTimes(1)
  await act(async () => pending.resolve({ savedCount: 2, skippedCount: 0 }))
  expect(await screen.findByText('Đã lưu 2 câu, bỏ qua 0 câu đã có.')).toBeInTheDocument()
})

test('using bank questions replaces the whole set in selection order, once even on a double click', async () => {
  renderContent()
  await loaded()
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  const pending = deferred<SessionQuestions>()
  const fromBank = vi.spyOn(questionBankService, 'useInSession').mockReturnValue(pending.promise)

  chooseBank('Dùng câu từ ngân hàng')
  const dialog = screen.getByRole('dialog')
  await within(dialog).findByText(bankItems[0].content)
  for (const item of [bankItems[3], bankItems[1], bankItems[0]]) {
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: new RegExp(item.content.slice(0, 15)) }),
    )
  }
  fireEvent.click(within(dialog).getByRole('button', { name: /^Dùng/ }))
  const confirm = within(dialog).getByRole('button', { name: 'Thay toàn bộ bộ câu hỏi' })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  expect(fromBank).toHaveBeenCalledTimes(1)
  expect(fromBank).toHaveBeenCalledWith(sessionId, [
    bankItems[3].id,
    bankItems[1].id,
    bankItems[0].id,
  ])

  const replaced: SessionQuestions = {
    sessionPublicId: sessionId,
    questions: [bankItems[3], bankItems[1], bankItems[0]].map((item, index) => ({
      publicId: `new-${index}`,
      orderIndex: index + 1,
      content: item.content,
      domain: item.domain,
      difficulty: item.difficulty,
    })),
  }
  await act(async () => pending.resolve(replaced))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  const items = within(screen.getByRole('list')).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(items[0]).toHaveTextContent(bankItems[3].content)
  expect(items[2]).toHaveTextContent(bankItems[0].content)
  expect(screen.queryByText(first.content)).not.toBeInTheDocument()
})

test('a from-bank failure leaves the current set untouched', async () => {
  renderContent()
  await loaded()
  vi.spyOn(questionBankService, 'list').mockResolvedValue(bankPage())
  vi.spyOn(questionBankService, 'useInSession').mockRejectedValue({
    status: 500,
    message: 'Infra',
  })
  chooseBank('Dùng câu từ ngân hàng')
  const dialog = screen.getByRole('dialog')
  await within(dialog).findByText(bankItems[0].content)
  for (const item of bankItems.slice(0, 3)) {
    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: new RegExp(item.content.slice(0, 15)) }),
    )
  }
  fireEvent.click(within(dialog).getByRole('button', { name: /^Dùng/ }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Thay toàn bộ bộ câu hỏi' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Bộ câu hỏi hiện tại không đổi',
  )
  expect(screen.getByText(first.content)).toBeInTheDocument()
  expect(screen.getByText(second.content)).toBeInTheDocument()
})
