import type { InterviewHistoryAnswer, InterviewHistoryQuestion } from '@/types/history'
import type { GeneratedQuestion, QuestionDifficulty, QuestionDomain } from '@/types/interview'

const DOMAIN_VALUES: readonly string[] = ['TECHNICAL', 'BEHAVIORAL', 'SITUATIONAL']
const DIFFICULTY_VALUES: readonly string[] = ['EASY', 'MEDIUM', 'HARD']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Chuỗi không rỗng ở key đầu tiên dùng được; null khi không key nào có. */
function readText(source: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return null
}

function readNumber(source: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function readEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  allowed: readonly string[],
): T | null {
  const value = source[key]
  if (typeof value !== 'string') return null
  const upper = value.toUpperCase()
  return allowed.includes(upper) ? (upper as T) : null
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value)) return null
  const found = value.find(isRecord)
  return found ?? null
}

/**
 * Câu trả lời của một câu hỏi.
 *
 * Quan hệ câu hỏi - câu trả lời là 1-1 về nghiệp vụ nhưng 1-n trong database,
 * nên đọc cả `answer` và phần tử đầu của `answers`; không có cả hai thì thử đọc
 * ngay trên chính câu hỏi, cho trường hợp backend trả phẳng. Rỗng hoàn toàn thì
 * trả null: câu này chưa được trả lời.
 */
function readAnswer(question: Record<string, unknown>): InterviewHistoryAnswer | null {
  const nested = isRecord(question.answer) ? question.answer : firstRecord(question.answers)
  const scope = nested ?? question

  const videoUrl = readText(scope, ['videoUrl', 'video_url'])
  const rawTranscript = scope.transcript
  // Chuỗi rỗng vẫn là transcript: backend cho phép nộp câu trả lời không có chữ.
  const transcript = typeof rawTranscript === 'string' ? rawTranscript : null
  const durationSeconds = readNumber(scope, ['durationSeconds', 'duration_seconds'])

  if (videoUrl === null && transcript === null && durationSeconds === null) return null

  return { videoUrl, transcript: transcript ?? '', durationSeconds }
}

/**
 * Chuẩn hoá `InterviewHistoryDetail.questions` thành dữ liệu hiển thị được.
 *
 * Kiểu khai báo của field đó chỉ là hợp đồng trên giấy, không phải thứ kiểm
 * tra được lúc chạy, nên hàm này là lớp thích ứng duy nhất: nhận cả `answer`
 * lồng trong câu hỏi, phần tử đầu của `answers`, hay các field trả lời đặt
 * phẳng, và cả tên camelCase lẫn snake_case. Phần tử thiếu nội dung câu hỏi bị
 * bỏ qua thay vì hiện một dòng trống, và mọi field phụ thiếu đều suy biến
 * thành null chứ không ném lỗi: hiện thiếu badge vẫn tốt hơn là trang trắng.
 * Backend đổi shape thì chỉ phải sửa ở đây.
 */
export function parseHistoryQuestions(raw: unknown[]): InterviewHistoryQuestion[] {
  const questions: InterviewHistoryQuestion[] = []

  raw.forEach((entry, index) => {
    if (!isRecord(entry)) return

    const content = readText(entry, ['content', 'questionContent', 'question'])
    if (content === null) return

    questions.push({
      id: readText(entry, ['publicId', 'id', 'questionPublicId']) ?? `question-${index}`,
      orderIndex: readNumber(entry, ['orderIndex', 'order']) ?? index,
      content,
      domain: readEnum<QuestionDomain>(entry, 'domain', DOMAIN_VALUES),
      difficulty: readEnum<QuestionDifficulty>(entry, 'difficulty', DIFFICULTY_VALUES),
      answer: readAnswer(entry),
    })
  })

  return [...questions].sort((a, b) => a.orderIndex - b.orderIndex)
}

/**
 * Bộ câu hỏi từ `GET /interview-session/:id/questions` đưa về cùng một kiểu.
 *
 * Endpoint đó chỉ trả câu hỏi, không có câu trả lời, nên `answer` luôn null và
 * UI sẽ nói là chưa có bản ghi.
 */
export function fromGeneratedQuestions(
  questions: readonly GeneratedQuestion[],
): InterviewHistoryQuestion[] {
  return [...questions]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((question) => ({
      id: question.publicId,
      orderIndex: question.orderIndex,
      content: question.content,
      domain: question.domain,
      difficulty: question.difficulty,
      answer: null,
    }))
}
