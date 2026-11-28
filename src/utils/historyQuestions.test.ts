import { expect, test } from 'vitest'

import { fromGeneratedQuestions, parseHistoryQuestions } from './historyQuestions'

import type { GeneratedQuestion } from '@/types/interview'

test('đọc đủ câu hỏi và câu trả lời rồi sắp theo orderIndex', () => {
  const questions = parseHistoryQuestions([
    {
      publicId: 'q-2',
      orderIndex: 2,
      content: 'Kể về một lần bạn xử lý sự cố production.',
      domain: 'BEHAVIORAL',
      difficulty: 'MEDIUM',
      answer: {
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/a2.webm',
        transcript: 'Tôi đã rollback bản deploy.',
        durationSeconds: 95,
      },
    },
    {
      publicId: 'q-1',
      orderIndex: 1,
      content: 'Giải thích event loop trong Node.js.',
      domain: 'TECHNICAL',
      difficulty: 'HARD',
      answer: {
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/a1.webm',
        transcript: 'Event loop xử lý callback theo từng pha.',
        durationSeconds: 120,
      },
    },
  ])

  expect(questions.map((question) => question.id)).toEqual(['q-1', 'q-2'])
  expect(questions[0]).toEqual({
    id: 'q-1',
    orderIndex: 1,
    content: 'Giải thích event loop trong Node.js.',
    domain: 'TECHNICAL',
    difficulty: 'HARD',
    answer: {
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/a1.webm',
      transcript: 'Event loop xử lý callback theo từng pha.',
      durationSeconds: 120,
    },
  })
})

test('bỏ qua phần tử không phải object và phần tử không có nội dung câu hỏi', () => {
  const questions = parseHistoryQuestions([
    null,
    'câu hỏi dạng chuỗi',
    [],
    { publicId: 'q-1', content: '   ' },
    { publicId: 'q-2', content: 'Câu hỏi thật' },
  ])

  expect(questions).toHaveLength(1)
  expect(questions[0]?.content).toBe('Câu hỏi thật')
})

test('thiếu id và orderIndex thì suy ra từ vị trí trong mảng', () => {
  const questions = parseHistoryQuestions([{ content: 'Câu một' }, { content: 'Câu hai' }])

  expect(questions.map((question) => [question.id, question.orderIndex])).toEqual([
    ['question-0', 0],
    ['question-1', 1],
  ])
})

test('đọc câu trả lời từ mảng answers của quan hệ 1-n', () => {
  const questions = parseHistoryQuestions([
    {
      content: 'Câu hỏi',
      answers: [
        { videoUrl: 'https://cdn.test/a.webm', transcript: 'nội dung', durationSeconds: 7 },
      ],
    },
  ])

  expect(questions[0]?.answer).toEqual({
    videoUrl: 'https://cdn.test/a.webm',
    transcript: 'nội dung',
    durationSeconds: 7,
  })
})

test('đọc câu trả lời trả phẳng trên chính câu hỏi, kể cả tên snake_case', () => {
  const questions = parseHistoryQuestions([
    {
      content: 'Câu hỏi',
      video_url: 'https://cdn.test/b.webm',
      transcript: 'phẳng',
      duration_seconds: 42,
    },
  ])

  expect(questions[0]?.answer).toEqual({
    videoUrl: 'https://cdn.test/b.webm',
    transcript: 'phẳng',
    durationSeconds: 42,
  })
})

test('không có dấu vết câu trả lời nào thì answer là null', () => {
  const questions = parseHistoryQuestions([
    { content: 'Chưa trả lời' },
    { content: 'Answer rỗng', answer: {} },
  ])

  expect(questions[0]?.answer).toBeNull()
  expect(questions[1]?.answer).toBeNull()
})

// Người dùng được phép nộp câu trả lời không có chữ nào, nên chuỗi rỗng là một
// transcript thật — khác hẳn với việc không có câu trả lời.
test('transcript rỗng vẫn tính là đã trả lời khi còn video', () => {
  const questions = parseHistoryQuestions([
    { content: 'Câu hỏi', answer: { videoUrl: 'https://cdn.test/c.webm', transcript: '' } },
  ])

  expect(questions[0]?.answer).toEqual({
    videoUrl: 'https://cdn.test/c.webm',
    transcript: '',
    durationSeconds: null,
  })
})

test('video thiếu hoặc đã xoá thì vẫn giữ lại transcript', () => {
  const questions = parseHistoryQuestions([
    { content: 'Câu hỏi', answer: { transcript: 'chỉ còn chữ' } },
  ])

  expect(questions[0]?.answer).toEqual({
    videoUrl: null,
    transcript: 'chỉ còn chữ',
    durationSeconds: null,
  })
})

test('domain và difficulty lạ thành null, chữ thường được chấp nhận', () => {
  const [unknown, lowercase] = parseHistoryQuestions([
    { content: 'Một', domain: 'CULTURE_FIT', difficulty: 'IMPOSSIBLE' },
    { content: 'Hai', domain: 'technical', difficulty: 'easy' },
  ])

  expect([unknown?.domain, unknown?.difficulty]).toEqual([null, null])
  expect([lowercase?.domain, lowercase?.difficulty]).toEqual(['TECHNICAL', 'EASY'])
})

test('fromGeneratedQuestions sắp lại thứ tự và không bịa ra câu trả lời', () => {
  const generated: GeneratedQuestion[] = [
    {
      publicId: 'g-2',
      orderIndex: 2,
      content: 'Câu hai',
      domain: 'SITUATIONAL',
      difficulty: 'EASY',
    },
    { publicId: 'g-1', orderIndex: 1, content: 'Câu một', domain: 'TECHNICAL', difficulty: 'HARD' },
  ]

  const questions = fromGeneratedQuestions(generated)

  expect(questions.map((question) => question.id)).toEqual(['g-1', 'g-2'])
  expect(questions.every((question) => question.answer === null)).toBe(true)
})
