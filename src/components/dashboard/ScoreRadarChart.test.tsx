import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ScoreRadarChart } from './ScoreRadarChart'

const latest = { contentScore: 8, relevanceScore: 7.6, confidenceScore: 6, overallScore: 7.4 }
const average = { contentScore: 6.7, relevanceScore: 6.5, confidenceScore: 5.8, overallScore: 6.4 }

test('chồng hai vùng lên ba trục tiêu chí và đọc được giá trị', () => {
  const { container } = render(
    <ScoreRadarChart
      maxScore={10}
      series={[
        { label: 'Trung bình', scores: average, tone: 'baseline' },
        { label: 'Buổi gần nhất', scores: latest, tone: 'primary' },
      ]}
    />,
  )

  expect(
    screen.getByRole('img', {
      name: /Buổi gần nhất: Nội dung 8, Phù hợp 7,6, Tự tin 6/,
    }),
  ).toBeInTheDocument()
  for (const tone of ['baseline', 'primary']) {
    const group = container.querySelector(`[data-series="${tone}"]`)
    expect(group?.querySelector('polygon')).not.toBeNull()
    expect(group?.querySelectorAll('circle')).toHaveLength(3)
  }
  expect(screen.getByText('Trung bình')).toBeInTheDocument()
  expect(screen.getByText('Buổi gần nhất')).toBeInTheDocument()
})

test('điểm ngoài thang được kẹp vào khung', () => {
  const { container } = render(
    <ScoreRadarChart
      maxScore={10}
      series={[
        {
          label: 'Lạ',
          scores: { contentScore: 99, relevanceScore: -5, confidenceScore: 5, overallScore: 5 },
          tone: 'primary',
        },
      ]}
    />,
  )

  // Đỉnh "Nội dung" nằm đúng ở mép trên của khung (bán kính tối đa), không vượt ra ngoài.
  const [top] = container.querySelectorAll('[data-series="primary"] circle')
  expect(Number(top.getAttribute('cy'))).toBeCloseTo(50)
})
