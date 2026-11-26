import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { HistoryQuestionPanel, type HistoryQuestionPanelProps } from './HistoryQuestionPanel'

import type { InterviewHistoryQuestion } from '@/types/history'

const answered: InterviewHistoryQuestion = {
  id: 'q-1',
  orderIndex: 1,
  content: 'Giải thích event loop trong Node.js.',
  domain: 'TECHNICAL',
  difficulty: 'HARD',
  answer: {
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/a1.webm',
    transcript: 'Event loop xử lý callback theo từng pha.',
    durationSeconds: 125,
  },
}

const unanswered: InterviewHistoryQuestion = {
  id: 'q-2',
  orderIndex: 2,
  content: 'Kể về một lần bạn xử lý sự cố production.',
  domain: 'BEHAVIORAL',
  difficulty: 'MEDIUM',
  answer: null,
}

function setup(overrides: Partial<HistoryQuestionPanelProps> = {}) {
  const onRetry = vi.fn()
  render(
    <HistoryQuestionPanel
      status="COMPLETED"
      questions={[answered]}
      isLoading={false}
      loadError=""
      isAnswerless={false}
      onRetry={onRetry}
      {...overrides}
    />,
  )
  return { onRetry }
}

test('hiện câu hỏi, video, transcript và thời lượng của câu đã trả lời', () => {
  setup({ questions: [answered, unanswered] })

  expect(screen.getByText('Câu hỏi và câu trả lời')).toBeInTheDocument()
  expect(screen.getByText('2 câu')).toBeInTheDocument()

  expect(screen.getByText('Giải thích event loop trong Node.js.')).toBeInTheDocument()
  expect(screen.getByText('Event loop xử lý callback theo từng pha.')).toBeInTheDocument()
  expect(screen.getByLabelText('Video câu trả lời 1')).toHaveAttribute(
    'src',
    'https://res.cloudinary.com/demo/video/upload/a1.webm',
  )
  expect(screen.getByText('02:05')).toBeInTheDocument()

  // Badge phân loại giúp người xem biết câu nào thuộc nhóm nào.
  expect(screen.getByText('Kỹ thuật')).toBeInTheDocument()
  expect(screen.getByText('Khó')).toBeInTheDocument()
})

test('câu đầu mở sẵn, các câu sau đóng lại để màn hình không quá dài', () => {
  setup({ questions: [answered, unanswered] })

  const items = screen.getAllByRole('group')
  expect(items[0]).toHaveAttribute('open')
  expect(items[1]).not.toHaveAttribute('open')
})

test('buổi đang chấm thì nói rõ điểm chưa có nhưng bản ghi đã nằm đây', () => {
  setup({ status: 'SCORING' })

  expect(screen.getByText(/Hệ thống đang chấm bài/)).toBeInTheDocument()
  expect(screen.getByLabelText('Video câu trả lời 1')).toBeInTheDocument()
})

test('buổi đã chấm xong thì không còn lời nhắc đang chấm', () => {
  setup()

  expect(screen.queryByText(/Hệ thống đang chấm bài/)).not.toBeInTheDocument()
})

test('câu chưa trả lời của buổi đang diễn ra nói là chưa trả lời', () => {
  setup({ status: 'IN_PROGRESS', questions: [unanswered] })

  expect(screen.getByText('Chưa có câu trả lời')).toBeInTheDocument()
  expect(screen.getByText('Bạn chưa trả lời câu này.')).toBeInTheDocument()
})

/*
 * Buổi đã hoàn thành mà không có bản ghi là hai chuyện khác nhau: nguồn dữ liệu
 * không kèm câu trả lời, hay người dùng thật sự bỏ trống câu đó.
 */
test('nguồn dữ liệu không có câu trả lời thì nói là chưa đọc được, không nói là bỏ trống', () => {
  setup({ questions: [unanswered], isAnswerless: true })

  expect(screen.getByText('Chưa đọc được video và transcript của câu này.')).toBeInTheDocument()
})

test('buổi đã chấm mà một câu không có bản ghi thì nói đúng là không có', () => {
  setup({ questions: [unanswered], isAnswerless: false })

  expect(screen.getByText('Câu này không có bản ghi trả lời.')).toBeInTheDocument()
})

test('video đã xoá thì vẫn giữ transcript thay vì để trống', () => {
  setup({
    questions: [{ ...answered, answer: { ...answered.answer!, videoUrl: null } }],
  })

  expect(screen.getByText(/Video của câu này không còn khả dụng/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Video câu trả lời 1')).not.toBeInTheDocument()
  expect(screen.getByText('Event loop xử lý callback theo từng pha.')).toBeInTheDocument()
})

test('transcript rỗng nói rõ là không có chữ, không để khoảng trắng', () => {
  setup({
    questions: [{ ...answered, answer: { ...answered.answer!, transcript: '   ' } }],
  })

  expect(screen.getByText('Câu trả lời này không có transcript.')).toBeInTheDocument()
})

test('đang tải thì hiện spinner', () => {
  setup({ isLoading: true, questions: [] })

  expect(screen.getByRole('status', { name: 'Đang tải câu hỏi' })).toBeInTheDocument()
})

test('lỗi tải thì hiện cảnh báo và thử lại được', () => {
  const { onRetry } = setup({ loadError: 'Mất kết nối', questions: [] })

  expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối')

  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})

test('buổi chưa bắt đầu và buổi đã xong nói khác nhau khi không có câu hỏi nào', () => {
  const { unmount } = render(
    <HistoryQuestionPanel
      status="CREATED"
      questions={[]}
      isLoading={false}
      loadError=""
      isAnswerless
      onRetry={vi.fn()}
    />,
  )
  expect(screen.getByText('Buổi này chưa có câu hỏi nào được sinh.')).toBeInTheDocument()
  unmount()

  setup({ questions: [] })
  expect(screen.getByText('Không đọc được danh sách câu hỏi của buổi này.')).toBeInTheDocument()
})
