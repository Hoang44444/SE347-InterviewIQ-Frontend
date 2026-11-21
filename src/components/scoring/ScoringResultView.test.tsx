import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ScoringResultView } from './ScoringResultView'

import type { SessionResult } from '@/types/scoring'

const sampleResult: SessionResult = {
  sessionId: '3f1c2b9e-8a4d-4f6b-9c1e-2d7a5b0e4f11',
  scores: {
    publicId: '550e8400-e29b-41d4-a716-446655440000',
    contentScore: 8.5,
    relevanceScore: 7.5,
    confidenceScore: 6.5,
    overallScore: 7.7,
    scoredAt: '2026-11-20T09:00:00.000Z',
  },
  summary: {
    publicId: '660e8400-e29b-41d4-a716-446655440000',
    overallFeedback: 'Ứng viên có tư duy hệ thống và nền tảng backend tốt.',
    strengths: [
      {
        category: 'TECHNICAL_KNOWLEDGE',
        title: 'Nắm vững Clean Architecture',
        description: 'Giải thích rõ ràng cách phân tầng và DI.',
      },
    ],
    improvements: [
      {
        category: 'COMMUNICATION',
        title: 'Trình bày súc tích hơn',
        description: 'Nên nêu kết quả trước khi đi vào chi tiết.',
        suggestion: 'Áp dụng mô hình STAR.',
      },
    ],
    scoringModel: 'gemini-3.8-flash',
    promptVersion: 'v2.0',
    generatedAt: '2026-11-20T09:00:00.000Z',
  },
  emotionTimeline: [
    {
      questionPublicId: 'q-1',
      orderIndex: 1,
      domain: 'TECHNICAL',
      difficulty: 'MEDIUM',
      durationSeconds: 75,
      emotionSummary: {
        dominant: 'neutral',
        distribution: { neutral: 0.7, happy: 0.3 },
      },
    },
  ],
}

test('renders overall score, 3 criteria radar + bars, category badges, metadata, and emotion timeline', () => {
  render(<ScoringResultView result={sampleResult} />)

  expect(screen.getByText('7,7')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /Biểu đồ 3 tiêu chí/ })).toBeInTheDocument()
  expect(screen.getByText('Chất lượng nội dung')).toBeInTheDocument()
  expect(screen.getByText('Độ phù hợp câu hỏi & CV/JD')).toBeInTheDocument()
  expect(screen.getByText('Phong thái & sự tự tin')).toBeInTheDocument()
  expect(screen.getByText('8,5')).toBeInTheDocument()
  expect(screen.getByText('7,5')).toBeInTheDocument()
  expect(screen.getByText('6,5')).toBeInTheDocument()

  expect(screen.getByText('Kiến thức chuyên môn')).toBeInTheDocument()
  expect(screen.getByText('Giao tiếp')).toBeInTheDocument()
  expect(screen.getByText('Nắm vững Clean Architecture')).toBeInTheDocument()
  expect(screen.getByText('Áp dụng mô hình STAR.')).toBeInTheDocument()
  expect(screen.getByText(/gemini-3\.8-flash · v2\.0/)).toBeInTheDocument()

  expect(screen.getByText('Câu 1')).toBeInTheDocument()
  expect(screen.getByText('01:15')).toBeInTheDocument()
})
