import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, expect, test } from 'vitest'

import { apiClient } from './apiClient'
import { cheatLogService } from './cheatLogService'

const sessionId = '3f1c2b9e-8a4d-4f6b-9c1e-2d7a5b0e4f11'
const summary = {
  totalCount: 1,
  countsByType: { TAB_SWITCH: 1, WINDOW_BLUR: 0, FACE_MISSING: 0, MULTIPLE_FACES: 0 },
}

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

function recordRequests(data: unknown): InternalAxiosRequestConfig[] {
  const requests: InternalAxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    return {
      data: { statusCode: 200, success: true, data, message: 'OK', timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  return requests
}

test('record POSTs the event to the session cheat-logs endpoint and unwraps the envelope', async () => {
  const log = {
    id: 'l1',
    eventType: 'TAB_SWITCH',
    description: null,
    occurredAt: 'x',
    createdAt: 'y',
  }
  const requests = recordRequests({ log, summary })
  const payload = { eventType: 'TAB_SWITCH', occurredAt: '2026-11-09T10:05:00.000Z' } as const

  await expect(cheatLogService.record(sessionId, payload)).resolves.toEqual({ log, summary })

  expect(requests[0].method).toBe('post')
  expect(requests[0].url).toBe(`/interview-session/${sessionId}/cheat-logs`)
  expect(JSON.parse(requests[0].data as string)).toEqual(payload)
})

test('list GETs the logs and counters of the session', async () => {
  const requests = recordRequests({ logs: [], summary })

  await expect(cheatLogService.list(sessionId)).resolves.toEqual({ logs: [], summary })

  expect(requests[0].method).toBe('get')
  expect(requests[0].url).toBe(`/interview-session/${sessionId}/cheat-logs`)
})
