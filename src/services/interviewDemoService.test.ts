import { expect, test, vi } from 'vitest'

import { createInterviewDemoService } from './interviewDemoService'

import { recording } from '@/test/interviewFixtures'

test('demo simulates upload, full answers and scoring locally with separate room state', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  const demo = createInterviewDemoService()
  const [question] = await demo.getQuestions('demo')
  const params = await demo.getAnswerSignedParams('demo', question.id)
  const assetId = await demo.uploadAnswerVideo(params, recording(question.id))
  const saved = await demo.submitAnswer('demo', question.id, {
    cloudinaryPublicId: assetId,
    transcript: ' demo ',
  })
  expect(saved).toMatchObject({
    questionPublicId: question.id,
    transcript: ' demo ',
    durationSeconds: 13,
  })
  const retry = await demo.submitAnswer('demo', question.id, {
    cloudinaryPublicId: assetId,
    transcript: '',
  })
  expect(retry.publicId).toBe(saved.publicId)
  const submission = await demo.finishSession('demo', {
    cvPublicId: 'demo-cv',
    totalQuestions: 3,
    durationSeconds: 20,
  })
  expect(submission.status).toBe('QUEUED')
  expect((await demo.getScoringJobStatus(submission.jobId)).status).toBe('PROCESSING')
  expect((await demo.getScoringJobStatus(submission.jobId)).status).toBe('COMPLETED')
  await expect(demo.getAnswerSignedParams('demo', question.id)).rejects.toMatchObject({
    status: 409,
  })
  const otherRoom = createInterviewDemoService()
  expect((await otherRoom.getAnswerSignedParams('demo', question.id)).cloudinaryPublicId).not.toBe(
    assetId,
  )
  expect(fetcher).not.toHaveBeenCalled()
})
