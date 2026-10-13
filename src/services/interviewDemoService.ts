import { validateInterviewVideo } from './interviewVideoUpload'

import type { Answer, Interview, InterviewRoomService, Question } from '@/types/interview'
import type { InterviewRecording } from '@/types/recording'

const interview: Interview = {
  id: 'demo',
  title: 'Phòng phỏng vấn mẫu',
  position: 'Frontend Developer',
  status: 'in_progress',
  questionCount: 3,
  createdAt: '2026-09-29T00:00:00.000Z',
  cvPublicId: 'demo-cv',
}

const questions: Question[] = [
  {
    id: 'demo-question-1',
    kind: 'behavioral',
    content: 'Giới thiệu bản thân và một dự án bạn tự hào nhất.',
    suggestedSeconds: 120,
  },
  {
    id: 'demo-question-2',
    kind: 'technical',
    content: 'Bạn quản lý state và xử lý dữ liệu bất đồng bộ trong React như thế nào?',
    suggestedSeconds: 180,
  },
  {
    id: 'demo-question-3',
    kind: 'behavioral',
    content: 'Kể về một lỗi khó bạn từng gặp và cách bạn tìm ra nguyên nhân.',
    suggestedSeconds: 120,
  },
]

/** Mỗi phòng demo có state riêng và không gọi mạng. */
export function createInterviewDemoService(): InterviewRoomService {
  const assets = new Map<string, InterviewRecording>()
  const answers = new Map<string, Answer>()
  const jobs = new Map<string, number>()
  let submitted = false
  function requireOpen() {
    if (submitted) throw { status: 409, message: 'Session demo đã nộp.' }
  }

  return {
    getById: async () => ({ ...interview }),
    getQuestions: async () => questions.map((question) => ({ ...question })),
    getAnswerSignedParams: async (_id, questionId) => {
      requireOpen()
      return {
        uploadUrl: 'local-demo',
        apiKey: 'demo',
        timestamp: Math.floor(Date.now() / 1000),
        signature: 'demo',
        cloudinaryPublicId: `demo/${questionId}/${crypto.randomUUID()}`,
        resourceType: 'video',
        allowedFormats: 'mp4,webm',
        overwrite: false,
        maxFileSizeBytes: 104857600,
      }
    },
    uploadAnswerVideo: async (params, recording) => {
      requireOpen()
      validateInterviewVideo(recording.blob, params.maxFileSizeBytes)
      assets.set(params.cloudinaryPublicId, recording)
      return params.cloudinaryPublicId
    },
    submitAnswer: async (_id, questionId, payload) => {
      requireOpen()
      const recording = assets.get(payload.cloudinaryPublicId)
      if (!recording || recording.questionId !== questionId)
        throw new Error('Không tìm thấy bản ghi demo cho câu này.')
      const now = new Date().toISOString()
      const previous = answers.get(questionId)
      const answer: Answer = {
        publicId: previous?.publicId ?? crypto.randomUUID(),
        questionPublicId: questionId,
        videoUrl: recording.url,
        transcript: payload.transcript,
        durationSeconds: Math.ceil(recording.durationSeconds),
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      }
      answers.set(questionId, answer)
      return answer
    },
    finishSession: async (id) => {
      requireOpen()
      submitted = true
      const jobId = crypto.randomUUID()
      jobs.set(jobId, 0)
      return { sessionPublicId: id, jobId, status: 'QUEUED' }
    },
    getScoringJobStatus: async (jobId) => {
      const polls = jobs.get(jobId)
      if (polls === undefined) throw { status: 404, message: 'Không tìm thấy job demo.' }
      jobs.set(jobId, polls + 1)
      const completed = polls > 0
      return {
        jobId,
        sessionId: 'demo',
        status: completed ? 'COMPLETED' : 'PROCESSING',
        createdAt: interview.createdAt,
        completedAt: completed ? new Date().toISOString() : null,
      }
    },
  }
}
