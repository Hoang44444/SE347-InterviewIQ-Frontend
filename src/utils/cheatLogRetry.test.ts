import { expect, test } from 'vitest'

import { isRetryableCheatLogError } from './cheatLogRetry'

test.each([0, 429, 500, 502, 503])('retries transient status %i', (status) => {
  expect(isRetryableCheatLogError({ status })).toBe(true)
})

test.each([400, 401, 404, 409])('does not retry status %i', (status) => {
  expect(isRetryableCheatLogError({ status })).toBe(false)
})

test('does not retry errors without a numeric status', () => {
  expect(isRetryableCheatLogError(new Error('boom'))).toBe(false)
  expect(isRetryableCheatLogError(null)).toBe(false)
  expect(isRetryableCheatLogError({ status: '500' })).toBe(false)
})
