import { expect, test } from 'vitest'

import { classifyFace, createConditionTracker, headPoseFromMatrix } from './faceConditions'

import type { FaceObservation } from '@/types/integrity'

const frontal = (time: number): FaceObservation => ({
  time,
  faceCount: 1,
  yawDeg: 0,
  pitchDeg: 0,
})
const noFace = (time: number): FaceObservation => ({
  time,
  faceCount: 0,
  yawDeg: null,
  pitchDeg: null,
})

test('classifies no face, multiple faces and head turned beyond thresholds', () => {
  expect(classifyFace(noFace(0))).toEqual(['NO_FACE'])
  expect(classifyFace({ ...frontal(0), faceCount: 2 })).toEqual(['MULTIPLE_FACES'])
  expect(classifyFace({ ...frontal(0), yawDeg: -40 })).toEqual(['LOOKING_AWAY'])
  expect(classifyFace({ ...frontal(0), pitchDeg: 35 })).toEqual(['LOOKING_AWAY'])
  expect(classifyFace({ ...frontal(0), yawDeg: 20, pitchDeg: 20 })).toEqual([])
})

test('head pose is zero for identity and recovers a pure yaw rotation', () => {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  expect(headPoseFromMatrix(identity)).toEqual({ yawDeg: -0, pitchDeg: 0 })
  const angle = (40 * Math.PI) / 180
  // Xoay quanh trục Y: r20 = -sin(a), r00 = r22 = cos(a), r02 = sin(a) (column-major).
  const yawed = [
    Math.cos(angle),
    0,
    -Math.sin(angle),
    0,
    0,
    1,
    0,
    0,
    Math.sin(angle),
    0,
    Math.cos(angle),
    0,
    0,
    0,
    0,
    1,
  ]
  const pose = headPoseFromMatrix(yawed)
  expect(pose.yawDeg).toBeCloseTo(40, 5)
  expect(pose.pitchDeg).toBeCloseTo(0, 5)
})

test('ignores a short glitch and only starts after the sustain time', () => {
  const tracker = createConditionTracker(
    { NO_FACE: 3000, MULTIPLE_FACES: 2000, LOOKING_AWAY: 3000 },
    1000,
  )
  expect(tracker.update(noFace(0)).started).toEqual([])
  expect(tracker.update(noFace(2000)).started).toEqual([])
  tracker.update(frontal(2500)) // nhiễu ngắn, reset
  expect(tracker.update(noFace(3000)).started).toEqual([])
  expect(tracker.update(noFace(5900)).started).toEqual([])
  expect(tracker.update(noFace(6000)).started).toEqual([{ condition: 'NO_FACE', startedAt: 3000 }])
  // Không phát lại khi vẫn đang diễn ra.
  expect(tracker.update(noFace(8000)).started).toEqual([])
})

test('ends only after the recover time and keeps the event open on a brief return', () => {
  const tracker = createConditionTracker(
    { NO_FACE: 1000, MULTIPLE_FACES: 1000, LOOKING_AWAY: 1000 },
    1000,
  )
  tracker.update(noFace(0))
  expect(tracker.update(noFace(1000)).started).toHaveLength(1)
  expect(tracker.update(frontal(1500)).ended).toEqual([])
  tracker.update(noFace(1800)) // quay lại ngay, vẫn cùng một sự kiện
  expect(tracker.update(frontal(2000)).ended).toEqual([])
  expect(tracker.update(frontal(2900)).ended).toEqual([])
  expect(tracker.update(frontal(3000)).ended).toEqual([
    { condition: 'NO_FACE', startedAt: 0, endedAt: 2000 },
  ])
})

test('flush closes active conditions and ignores pending ones', () => {
  const tracker = createConditionTracker(
    { NO_FACE: 1000, MULTIPLE_FACES: 1000, LOOKING_AWAY: 1000 },
    1000,
  )
  tracker.update({ ...frontal(0), faceCount: 2 })
  tracker.update({ ...frontal(1000), faceCount: 2 })
  tracker.update(noFace(1100)) // chưa đủ giữ
  expect(tracker.flush(1500)).toEqual([
    { condition: 'MULTIPLE_FACES', startedAt: 0, endedAt: 1100 },
  ])
  expect(tracker.flush(2000)).toEqual([])
})
