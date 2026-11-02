import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'

import {
  QuestionGenerationPanel,
  type QuestionGenerationPanelProps,
} from './QuestionGenerationPanel'

import { generatedQuestions } from '@/test/sessionFixtures'

function renderPanel(overrides: Partial<QuestionGenerationPanelProps> = {}) {
  const props: QuestionGenerationPanelProps = {
    questions: [],
    isLoading: false,
    loadError: '',
    isGenerating: false,
    generateError: null,
    onGenerate: vi.fn(),
    onReload: vi.fn(),
    ...overrides,
  }
  render(
    <MemoryRouter>
      <QuestionGenerationPanel {...props} />
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
  fireEvent.change(select, { target: { value: '8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh câu hỏi' }))
  expect(props.onGenerate).toHaveBeenCalledWith(8)
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

test('regenerating requires confirmation and can be cancelled', () => {
  const props = renderPanel({ questions: generatedQuestions.questions })
  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại' }))
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveTextContent('thay thế toàn bộ 2 câu hỏi')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
  expect(props.onGenerate).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Sinh lại' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sinh lại' }))
  expect(props.onGenerate).toHaveBeenCalledWith(5)
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
