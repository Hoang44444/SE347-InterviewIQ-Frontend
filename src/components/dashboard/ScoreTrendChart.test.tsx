import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ScoreTrendChart } from './ScoreTrendChart'

import type { InterviewStatsSession } from '@/types/dashboard'

function session(index: number, overallScore: number): InterviewStatsSession {
  return {
    id: `00000000-0000-4000-8000-00000000000${index}`,
    title: `Buổi ${index}`,
    createdAt: `2026-10-0${index}T08:00:00.000Z`,
    contentScore: overallScore,
    relevanceScore: overallScore,
    confidenceScore: overallScore,
    overallScore,
  }
}

function seriesGroup(container: HTMLElement, key: string) {
  return container.querySelector(`[data-series="${key}"]`)
}

test('vẽ mỗi tiêu chí một đường với một chấm cho từng buổi', () => {
  const { container } = render(
    <ScoreTrendChart points={[session(1, 4.8), session(2, 7.1), session(3, 7.4)]} maxScore={10} />,
  )

  expect(screen.getByRole('img', { name: 'Xu hướng điểm của 3 buổi gần nhất' })).toBeInTheDocument()
  for (const key of ['overallScore', 'contentScore', 'relevanceScore', 'confidenceScore']) {
    const group = seriesGroup(container, key)
    expect(group?.querySelector('polyline')).not.toBeNull()
    expect(group?.querySelectorAll('circle')).toHaveLength(3)
  }
  // Chấm có chú thích đọc được: tên buổi, ngày, tiêu chí và điểm.
  expect(screen.getAllByText('Buổi 3 (03/10): Điểm tổng 7,4')).toHaveLength(1)
})

test('một buổi thì chỉ có chấm, không có đường', () => {
  const { container } = render(<ScoreTrendChart points={[session(1, 6)]} maxScore={10} />)

  expect(container.querySelector('polyline')).toBeNull()
  expect(seriesGroup(container, 'overallScore')?.querySelectorAll('circle')).toHaveLength(1)
})

test('bấm chú thích để ẩn hiện một đường nhưng luôn chừa lại ít nhất một đường', () => {
  const { container } = render(
    <ScoreTrendChart points={[session(1, 5), session(2, 6)]} maxScore={10} />,
  )

  const content = screen.getByRole('button', { name: 'Nội dung' })
  fireEvent.click(content)
  expect(content).toHaveAttribute('aria-pressed', 'false')
  expect(seriesGroup(container, 'contentScore')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Phù hợp' }))
  fireEvent.click(screen.getByRole('button', { name: 'Tự tin' }))
  // Chỉ còn điểm tổng: bấm nữa thì không ẩn
  fireEvent.click(screen.getByRole('button', { name: 'Điểm tổng' }))
  expect(screen.getByRole('button', { name: 'Điểm tổng' })).toHaveAttribute('aria-pressed', 'true')
  expect(seriesGroup(container, 'overallScore')).not.toBeNull()

  fireEvent.click(content)
  expect(seriesGroup(container, 'contentScore')).not.toBeNull()
})

test('nhiều buổi thì chỉ ghi ngày ở đầu, giữa và cuối trục', () => {
  const points = Array.from({ length: 9 }, (_, index) => session(index + 1, 5))

  render(<ScoreTrendChart points={points} maxScore={10} />)

  expect(screen.getByText('01/10', { selector: 'text' })).toBeInTheDocument()
  expect(screen.getByText('05/10', { selector: 'text' })).toBeInTheDocument()
  expect(screen.getByText('09/10', { selector: 'text' })).toBeInTheDocument()
  expect(screen.queryByText('02/10', { selector: 'text' })).not.toBeInTheDocument()
})
