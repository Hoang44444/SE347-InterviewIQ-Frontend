import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { SpeechFeedback } from './SpeechFeedback'

test.each([
  ['slow', 70, 'Nói hơi chậm'],
  ['good', 130, 'Tốc độ vừa'],
  ['fast', 210, 'Nói hơi nhanh'],
] as const)('shows the %s speaking pace while listening', (pace, wpm, label) => {
  render(<SpeechFeedback status="listening" error={null} pace={pace} wpm={wpm} />)
  expect(screen.getByText(label)).toBeInTheDocument()
  expect(screen.getByText(`${wpm} từ/phút`)).toBeInTheDocument()
})

test('shows no pace until enough speech has been heard', () => {
  render(<SpeechFeedback status="listening" error={null} pace={null} wpm={null} />)
  expect(screen.getByText('Đang chép lời')).toBeInTheDocument()
  expect(screen.queryByText(/từ\/phút/)).not.toBeInTheDocument()
})

test('renders nothing while idle', () => {
  const { container } = render(<SpeechFeedback status="idle" error={null} pace={null} wpm={null} />)
  expect(container).toBeEmptyDOMElement()
})
