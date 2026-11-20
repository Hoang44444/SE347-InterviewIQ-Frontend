import { refreshAccessToken } from './apiClient'

import { API_URL, STORAGE_KEYS } from '@/constants'
import { SCORING_STREAM_BACKOFF_MS } from '@/constants/scoring'
import type { ScoringJobEvent, ScoringStreamConnectionState } from '@/types/scoring'
import { createSseParser } from '@/utils/sseParser'
import { storage } from '@/utils/storage'

export interface OpenScoringStreamOptions {
  onEvent: (event: ScoringJobEvent) => void
  onOpen?: () => void
  onStateChange?: (state: ScoringStreamConnectionState) => void
  signal: AbortSignal
}

function isScoringJobEvent(value: unknown): value is ScoringJobEvent {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (
    typeof record.userId !== 'string' ||
    typeof record.jobId !== 'string' ||
    (record.type !== 'answer-scored' && record.type !== 'answer-failed')
  ) {
    return false
  }
  if (typeof record.payload !== 'object' || record.payload === null) return false
  const payload = record.payload as Record<string, unknown>
  return typeof payload.sessionId === 'string'
}

function waitWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ScoringJobEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseParser(({ event, data }) => {
    if (event !== 'job-update') return
    try {
      const parsed: unknown = JSON.parse(data)
      if (isScoringJobEvent(parsed)) onEvent(parsed)
    } catch {
      // Bỏ qua payload JSON hỏng thay vì làm đứt luồng SSE đang mở.
    }
  })

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) parser.push(decoder.decode(value, { stream: true }))
    }
    if (!signal.aborted) {
      const tail = decoder.decode()
      if (tail) parser.push(tail)
      parser.flush()
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Mở kết nối SSE tới GET /api/scoring/stream bằng fetch + ReadableStream.
 *
 * - 401: gọi refreshAccessToken() của apiClient đúng 1 lần; có token mới thì nối lại ngay,
 *   trả null thì dừng hẳn.
 * - 403 hoặc 4xx khác: dừng hẳn, không reconnect.
 * - Lỗi mạng, 5xx hoặc stream đóng bất ngờ: reconnect với backoff tăng dần, reset khi mở lại.
 */
export async function openScoringStream({
  onEvent,
  onOpen,
  onStateChange,
  signal,
}: OpenScoringStreamOptions): Promise<void> {
  let attempt = 0
  let hasRefreshedOn401 = false

  while (!signal.aborted) {
    onStateChange?.(attempt === 0 ? 'connecting' : 'reconnecting')

    const token = storage.get<string>(STORAGE_KEYS.accessToken)
    const headers: Record<string, string> = { Accept: 'text/event-stream' }
    if (token) headers.Authorization = `Bearer ${token}`

    let response: Response | null = null
    try {
      response = await fetch(`${API_URL}/scoring/stream`, {
        method: 'GET',
        headers,
        signal,
      })
    } catch {
      if (signal.aborted) return
    }

    if (signal.aborted) return

    if (response) {
      if (response.status === 401) {
        if (hasRefreshedOn401) {
          onStateChange?.('stopped')
          return
        }
        hasRefreshedOn401 = true

        let nextToken: string | null = null
        let refreshFailedByNetwork = false
        try {
          nextToken = await refreshAccessToken()
        } catch {
          refreshFailedByNetwork = true
        }

        if (signal.aborted) return

        if (refreshFailedByNetwork) {
          hasRefreshedOn401 = false
        } else if (nextToken) {
          continue
        } else {
          onStateChange?.('stopped')
          return
        }
      } else if (response.status >= 400 && response.status < 500) {
        onStateChange?.('stopped')
        return
      } else if (response.ok && response.body) {
        attempt = 0
        hasRefreshedOn401 = false
        onStateChange?.('open')
        onOpen?.()
        try {
          await readEventStream(response.body, onEvent, signal)
        } catch {
          if (signal.aborted) return
        }
        if (signal.aborted) return
      }
    }

    const delay = SCORING_STREAM_BACKOFF_MS[Math.min(attempt, SCORING_STREAM_BACKOFF_MS.length - 1)]
    attempt += 1
    onStateChange?.('reconnecting')
    await waitWithAbort(delay, signal)
  }
}
