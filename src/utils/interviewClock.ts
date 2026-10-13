import type { InterviewSessionTiming } from '@/types/interview'

/** Thời gian thực, độc lập với thời lượng video và đồng hồ gợi ý. */
export function createInterviewClock(now: () => number = Date.now) {
  let startedAt: number | null = null
  let endedAt: number | null = null
  let questionStartedAt: number | null = null
  let questionMilliseconds = 0
  let questionId: string | null = null

  function snapshot() {
    const current = now()
    return {
      sessionSeconds:
        startedAt === null ? 0 : Math.max(0, Math.floor(((endedAt ?? current) - startedAt) / 1000)),
      questionSeconds: Math.max(
        0,
        Math.floor(
          (questionMilliseconds + (questionStartedAt === null ? 0 : current - questionStartedAt)) /
            1000,
        ),
      ),
    }
  }

  function submitQuestion() {
    if (questionStartedAt !== null) {
      questionMilliseconds += Math.max(0, (endedAt ?? now()) - questionStartedAt)
      questionStartedAt = null
    }
    return snapshot().questionSeconds
  }

  function openQuestion(id: string) {
    if (startedAt === null || endedAt !== null) return
    questionId = id
    questionMilliseconds = 0
    questionStartedAt = now()
  }

  return {
    snapshot,
    start(id: string) {
      if (startedAt !== null) return
      startedAt = now()
      openQuestion(id)
    },
    openQuestion,
    submitQuestion,
    resumeQuestion() {
      if (questionId !== null && questionStartedAt === null && endedAt === null) {
        questionStartedAt = now()
      }
    },
    finish(): InterviewSessionTiming {
      if (startedAt === null) throw new Error('Buổi phỏng vấn chưa bắt đầu.')
      endedAt ??= now()
      submitQuestion()
      return {
        startedAt: new Date(startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        durationSeconds: snapshot().sessionSeconds,
      }
    },
    resumeSession() {
      endedAt = null
    },
  }
}
