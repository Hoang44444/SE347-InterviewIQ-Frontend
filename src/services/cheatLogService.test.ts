import type { InternalAxiosRequestConfig } from 'axios'
import type { Socket } from 'socket.io-client'
import { afterEach, expect, test, vi } from 'vitest'

import { apiClient } from './apiClient'
import { cheatLogRestService as cheatLogService, createCheatLogService } from './cheatLogService'

import type { CheatLogAck } from '@/types/cheat'

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
  const payload = {
    clientEventId: '9b2f6c1a-5d3e-4a7b-8c90-1e2f3a4b5c6d',
    eventType: 'TAB_SWITCH',
    occurredAt: '2026-11-09T10:05:00.000Z',
  } as const

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

const payload = {
  clientEventId: '9b2f6c1a-5d3e-4a7b-8c90-1e2f3a4b5c6d',
  eventType: 'TAB_SWITCH',
  occurredAt: '2026-11-09T10:05:00.000Z',
} as const
const result = {
  log: { id: 'l1', eventType: 'TAB_SWITCH', description: null, occurredAt: 'x', createdAt: 'y' },
  summary,
} as const

function fakeSocket(initial: { connected: boolean; active: boolean }) {
  const emitWithAck = vi.fn<(event: string, body: unknown) => Promise<CheatLogAck>>()
  const socket = {
    ...initial,
    connect: vi.fn(() => {
      socket.active = true
    }),
    disconnect: vi.fn(() => {
      socket.active = false
      socket.connected = false
    }),
    timeout: vi.fn(() => ({ emitWithAck })),
  }
  return { socket, emitWithAck, asSocket: socket as unknown as Socket }
}

function fakeRest() {
  return { record: vi.fn().mockResolvedValue(result), list: vi.fn() }
}

test('socket: emits cheat-log:record with the session id and returns the ack data', async () => {
  const { socket, emitWithAck, asSocket } = fakeSocket({ connected: true, active: true })
  emitWithAck.mockResolvedValue({ success: true, data: result })
  const rest = fakeRest()
  const service = createCheatLogService(rest, () => asSocket)
  service.connect?.()

  await expect(service.record(sessionId, payload)).resolves.toEqual(result)

  expect(emitWithAck).toHaveBeenCalledWith('cheat-log:record', {
    sessionPublicId: sessionId,
    ...payload,
  })
  expect(socket.timeout).toHaveBeenCalledWith(5000)
  expect(rest.record).not.toHaveBeenCalled()
})

test('socket: an error ack becomes an ApiError and does not fall back to REST', async () => {
  const { emitWithAck, asSocket } = fakeSocket({ connected: true, active: true })
  emitWithAck.mockResolvedValue({
    success: false,
    statusCode: 409,
    code: 'CONFLICT',
    message: 'Session closed',
    errors: [{ field: 'occurredAt', messages: ['out of range'] }],
  })
  const rest = fakeRest()
  const service = createCheatLogService(rest, () => asSocket)
  service.connect?.()

  await expect(service.record(sessionId, payload)).rejects.toEqual({
    status: 409,
    code: 'CONFLICT',
    message: 'Session closed',
    errors: { occurredAt: ['out of range'] },
  })
  expect(rest.record).not.toHaveBeenCalled()
})

test('socket: an ack timeout is a retryable status 0 error', async () => {
  const { emitWithAck, asSocket } = fakeSocket({ connected: true, active: true })
  emitWithAck.mockRejectedValue(new Error('operation has timed out'))
  const service = createCheatLogService(fakeRest(), () => asSocket)
  service.connect?.()

  await expect(service.record(sessionId, payload)).rejects.toMatchObject({ status: 0 })
})

test('falls back to REST while the socket is not connected and wakes an idle socket', async () => {
  const { socket, emitWithAck, asSocket } = fakeSocket({ connected: false, active: false })
  const rest = fakeRest()
  const service = createCheatLogService(rest, () => asSocket)
  service.connect?.()
  socket.active = false // vd. connect_error Unauthorized: socket.io không tự nối lại
  socket.connect.mockClear()

  await expect(service.record(sessionId, payload)).resolves.toEqual(result)

  expect(rest.record).toHaveBeenCalledWith(sessionId, payload)
  expect(emitWithAck).not.toHaveBeenCalled()
  expect(socket.connect).toHaveBeenCalledTimes(1)
})

test('uses REST when connect was never called, and disconnect stops reconnecting', async () => {
  const { socket, asSocket } = fakeSocket({ connected: false, active: false })
  const rest = fakeRest()
  const service = createCheatLogService(rest, () => asSocket)

  await service.record(sessionId, payload)
  expect(socket.connect).not.toHaveBeenCalled()

  const disconnect = service.connect?.()
  disconnect?.()
  socket.connect.mockClear()
  await service.record(sessionId, payload)
  expect(socket.disconnect).toHaveBeenCalled()
  expect(socket.connect).not.toHaveBeenCalled()
  expect(rest.record).toHaveBeenCalledTimes(2)
})
