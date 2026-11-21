import { expect, test, vi } from 'vitest'

import { createSseParser } from './sseParser'
import type { SseMessage } from './sseParser'

test('parses SSE block split across arbitrary chunks', () => {
  const received: SseMessage[] = []
  const parser = createSseParser((message) => received.push(message))

  parser.push('eve')
  parser.push('nt: job-update\nda')
  parser.push('ta: {"type":"answer-scored"}\n')
  expect(received).toEqual([])

  parser.push('\n')
  expect(received).toEqual([{ event: 'job-update', data: '{"type":"answer-scored"}' }])
})

test('handles CRLF line endings including split CR and LF', () => {
  const received: SseMessage[] = []
  const parser = createSseParser((message) => received.push(message))

  parser.push('event: job-update\r')
  parser.push('\ndata: {"sessionId":"s1"}\r\n\r\n')

  expect(received).toEqual([{ event: 'job-update', data: '{"sessionId":"s1"}' }])
})

test('joins multiple data lines with newline and defaults event to message', () => {
  const received: SseMessage[] = []
  const parser = createSseParser((message) => received.push(message))

  parser.push('data: line 1\ndata: line 2\n\n')

  expect(received).toEqual([{ event: 'message', data: 'line 1\nline 2' }])
})

test('ignores comment lines like :ping and unknown fields', () => {
  const onMessage = vi.fn()
  const parser = createSseParser(onMessage)

  parser.push(':ping\n\nid: 42\nretry: 5000\nevent: ping\ndata: {"ok":true}\n\n')

  expect(onMessage).toHaveBeenCalledTimes(1)
  expect(onMessage).toHaveBeenCalledWith({ event: 'ping', data: '{"ok":true}' })
})

test('flushes trailing buffered message without final blank line', () => {
  const received: SseMessage[] = []
  const parser = createSseParser((message) => received.push(message))

  parser.push('event: job-update\ndata: {"broken":')
  expect(received).toEqual([])

  parser.flush()
  expect(received).toEqual([{ event: 'job-update', data: '{"broken":' }])
})
