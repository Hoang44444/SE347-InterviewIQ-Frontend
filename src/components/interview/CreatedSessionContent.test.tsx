import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'

import { CreatedSessionContent } from './CreatedSessionContent'

import { interviewService } from '@/services/interviewService'
import { generatedQuestions, session } from '@/test/sessionFixtures'
import type { InterviewSession } from '@/types/interview'

afterEach(() => vi.restoreAllMocks())

function renderContent(jobDescription: string | null) {
  vi.spyOn(interviewService, 'getSessionQuestions').mockResolvedValue(generatedQuestions)
  const created: InterviewSession = { ...session, jobDescription }
  render(
    <MemoryRouter>
      <CreatedSessionContent
        session={created}
        onStart={vi.fn()}
        isStarting={false}
        startDisabled={false}
      />
    </MemoryRouter>,
  )
}

const longJd = [
  'Vị trí: Backend Developer (NestJS)',
  '',
  'Mô tả công việc:',
  '- Thiết kế và phát triển RESTful API bằng NestJS, TypeScript.',
  '- Làm việc với PostgreSQL, thiết kế schema và tối ưu truy vấn.',
].join('\n')

test('a multi-line JD is collapsed first and expands with the toggle', async () => {
  renderContent(longJd)
  const toggle = await screen.findByRole('button', { name: 'Xem đầy đủ' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  const body = screen.getByText(/Vị trí: Backend Developer/)
  expect(body).toHaveClass('max-h-24')

  fireEvent.click(toggle)
  expect(screen.getByRole('button', { name: 'Thu gọn' })).toHaveAttribute('aria-expanded', 'true')
  expect(body).not.toHaveClass('max-h-24')

  fireEvent.click(screen.getByRole('button', { name: 'Thu gọn' }))
  expect(body).toHaveClass('max-h-24')
})

test('a short JD has no toggle', async () => {
  renderContent('Backend Developer (NestJS)')
  await waitFor(() => expect(screen.getByText('Backend Developer (NestJS)')).toBeInTheDocument())
  expect(screen.queryByRole('button', { name: 'Xem đầy đủ' })).not.toBeInTheDocument()
})

test('a session without JD says it can only be set at creation', async () => {
  renderContent(null)
  expect(await screen.findByText(/JD chỉ nhập được lúc tạo phòng/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Xem đầy đủ' })).not.toBeInTheDocument()
})
