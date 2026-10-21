import { expect, test } from 'vitest'
import { createInterviewClock } from './interviewClock.ts'

test('session starts on user action and includes submission waits', () => {
  let now = 0
  const clock = createInterviewClock(() => now)
  now = 60_000
  expect(clock.snapshot().sessionSeconds).toBe(0)
  clock.start('one')
  now = 210_000
  expect(clock.submitQuestion()).toBe(150)
  now = 220_000
  clock.openQuestion('two')
  now = 240_000
  expect(clock.submitQuestion()).toBe(20)
  now = 250_000
  const timing = clock.finish()
  expect(timing.durationSeconds).toBe(190)
  expect(timing.startedAt).toBe('1970-01-01T00:01:00.000Z')
  expect(timing.endedAt).toBe('1970-01-01T00:04:10.000Z')
  now = 300_000
  expect(clock.snapshot().sessionSeconds).toBe(190)
})

test('failed answer resumes only active answering time, not API latency', () => {
  let now = 0
  const clock = createInterviewClock(() => now)
  clock.start('one')
  now = 5_000
  expect(clock.submitQuestion()).toBe(5)
  now = 15_000
  clock.resumeQuestion()
  now = 18_000
  expect(clock.submitQuestion()).toBe(8)
  expect(clock.snapshot().sessionSeconds).toBe(18)
})

test('finishing freezes the active question and reopening a failed finish resumes it', () => {
  let now = 0
  const clock = createInterviewClock(() => now)
  clock.start('one')
  now = 4_000
  clock.finish()
  now = 14_000
  expect(clock.snapshot().questionSeconds).toBe(4)
  clock.resumeSession()
  clock.resumeQuestion()
  now = 16_000
  expect(clock.submitQuestion()).toBe(6)
  expect(clock.finish().durationSeconds).toBe(16)
})

test('opening the next question resets only its duration', () => {
  let now = 0
  const clock = createInterviewClock(() => now)
  clock.start('one')
  now = 9_000
  clock.submitQuestion()
  now = 12_000
  clock.openQuestion('two')
  expect(clock.snapshot()).toEqual({ sessionSeconds: 12, questionSeconds: 0 })
  now = 13_000
  expect(clock.snapshot()).toEqual({ sessionSeconds: 13, questionSeconds: 1 })
})

test('duplicate start and submit preserve the original timing', () => {
  let now = 0
  const clock = createInterviewClock(() => now)
  clock.start('one')
  now = 5_000
  clock.start('one')
  expect(clock.submitQuestion()).toBe(5)
  now = 15_000
  expect(clock.submitQuestion()).toBe(5)
  expect(clock.finish().durationSeconds).toBe(15)
})

test('time derives from timestamps across long gaps without interval ticks', () => {
  let now = 0
  const clock = createInterviewClock(() => now)
  clock.start('one')
  now = 3_600_750
  expect(clock.submitQuestion()).toBe(3600)
  expect(clock.finish().durationSeconds).toBe(3600)
})
