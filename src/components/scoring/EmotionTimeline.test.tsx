import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { EmotionTimeline } from './EmotionTimeline'

import type { QuestionEmotion } from '@/types/scoring'

test('renders empty state when timeline is empty or every question lacks emotion data', () => {
  const { rerender } = render(<EmotionTimeline timeline={[]} />)
  expect(screen.getByText('Buổi này không có dữ liệu biểu cảm')).toBeInTheDocument()

  const nullOnly: QuestionEmotion[] = [
    {
      questionPublicId: 'q-1',
      orderIndex: 1,
      domain: 'TECHNICAL',
      difficulty: 'EASY',
      durationSeconds: 45,
      emotionSummary: null,
    },
  ]
  rerender(<EmotionTimeline timeline={nullOnly} />)
  expect(screen.getByText('Buổi này không có dữ liệu biểu cảm')).toBeInTheDocument()
})

test('shows the positive label sent by the MediaPipe analysis', () => {
  const timeline: QuestionEmotion[] = [
    {
      questionPublicId: 'q-1',
      orderIndex: 1,
      domain: 'TECHNICAL',
      difficulty: 'MEDIUM',
      durationSeconds: 30,
      emotionSummary: { dominant: 'positive', distribution: { positive: 0.6, neutral: 0.4 } },
    },
  ]
  render(<EmotionTimeline timeline={timeline} />)
  expect(screen.getByText(/Tích cực 60%, Bình thản 40%/)).toBeInTheDocument()
})

test('renders stacked bars, legend, screen-reader breakdown, dash for missing rows, and disclaimer', () => {
  const timeline: QuestionEmotion[] = [
    {
      questionPublicId: 'q-1',
      orderIndex: 1,
      domain: 'TECHNICAL',
      difficulty: 'MEDIUM',
      durationSeconds: 65,
      emotionSummary: {
        dominant: 'neutral',
        distribution: { neutral: 0.78, happy: 0.22 },
      },
    },
    {
      questionPublicId: 'q-2',
      orderIndex: 2,
      domain: 'BEHAVIORAL',
      difficulty: 'EASY',
      durationSeconds: null,
      emotionSummary: null,
    },
  ]

  render(<EmotionTimeline timeline={timeline} />)

  expect(screen.getByText('Câu 1')).toBeInTheDocument()
  expect(screen.getByText('01:05')).toBeInTheDocument()
  expect(screen.getByText('Câu 2')).toBeInTheDocument()
  expect(screen.getByText(/Bình thản 78%, Vui vẻ 22%/)).toBeInTheDocument()
  expect(screen.getByText('Không có dữ liệu biểu cảm')).toBeInTheDocument()
  expect(
    screen.getByText('Biểu cảm chỉ là tín hiệu tham khảo, không dùng để kết luận năng lực.'),
  ).toBeInTheDocument()
})
