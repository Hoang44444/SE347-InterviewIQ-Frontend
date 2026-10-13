import { vi } from 'vitest'

import { answer, signedParams } from './interviewFixtures'

import type { InterviewRoomService } from '@/types/interview'

export function roomService(): InterviewRoomService {
  return {
    getById: vi.fn().mockResolvedValue({
      id: 'session',
      title: 'Interview',
      position: 'Frontend',
      status: 'in_progress',
      questionCount: 2,
      createdAt: '2026-10-12',
      cvPublicId: 'cv',
    }),
    getQuestions: vi.fn().mockResolvedValue([
      { id: 'one', kind: 'technical', content: 'First question', suggestedSeconds: 60 },
      { id: 'two', kind: 'behavioral', content: 'Second question', suggestedSeconds: 60 },
    ]),
    getAnswerSignedParams: vi.fn().mockResolvedValue(signedParams),
    uploadAnswerVideo: vi.fn().mockResolvedValue(signedParams.cloudinaryPublicId),
    submitAnswer: vi.fn().mockImplementation(async (_id, questionId, payload) => ({
      ...answer,
      questionPublicId: questionId,
      transcript: payload.transcript,
    })),
    finishSession: vi
      .fn()
      .mockResolvedValue({ sessionPublicId: 'session', jobId: 'job', status: 'QUEUED' }),
    getScoringJobStatus: vi.fn().mockResolvedValue({
      jobId: 'job',
      sessionId: 'session',
      status: 'PROCESSING',
      createdAt: '2026-10-12T10:00:00.000Z',
      completedAt: null,
    }),
  }
}
