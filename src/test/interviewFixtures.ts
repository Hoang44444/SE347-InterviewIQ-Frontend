import type { Answer, InterviewRecordingSignedParams } from '@/types/interview'
import type { InterviewRecording } from '@/types/recording'

export const signedParams: InterviewRecordingSignedParams = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/test-cloud/video/upload',
  apiKey: 'public-key',
  timestamp: 1791799200,
  signature: 'server-signature',
  cloudinaryPublicId: 'interview-answers/user/session/question/upload',
  resourceType: 'video',
  allowedFormats: 'mp4,webm',
  overwrite: false,
  maxFileSizeBytes: 104857600,
}

export const answer: Answer = {
  publicId: 'answer-id',
  questionPublicId: 'one',
  videoUrl: 'https://res.cloudinary.com/test-cloud/video/upload/answer.webm',
  transcript: '',
  durationSeconds: 13,
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
}

export function recording(questionId = 'one'): InterviewRecording {
  return {
    questionId,
    blob: new Blob(['video'], { type: 'video/webm;codecs=vp9,opus' }),
    mimeType: 'video/webm;codecs=vp9,opus',
    durationSeconds: 12.3,
    url: 'blob:recording',
  }
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
