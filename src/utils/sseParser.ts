export interface SseMessage {
  event: string
  data: string
}

export interface SseParser {
  push: (chunk: string) => void
  flush: () => void
}

/**
 * Bộ tách luồng Server-Sent Events thuần chuỗi, chịu được chunk bị cắt giữa block,
 * ký tự xuống dòng CRLF/LF, nhiều dòng data liên tiếp và dòng comment (ví dụ :ping).
 */
export function createSseParser(onMessage: (message: SseMessage) => void): SseParser {
  let buffer = ''
  let currentEvent = ''
  let dataLines: string[] = []

  function dispatch() {
    if (dataLines.length === 0) {
      currentEvent = ''
      return
    }
    const event = currentEvent || 'message'
    const data = dataLines.join('\n')
    currentEvent = ''
    dataLines = []
    onMessage({ event, data })
  }

  function processLine(rawLine: string) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line === '') {
      dispatch()
      return
    }
    if (line.startsWith(':')) return

    const colonIndex = line.indexOf(':')
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex)
    let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') {
      currentEvent = value
    } else if (field === 'data') {
      dataLines.push(value)
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk
      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)
        processLine(line)
        newlineIndex = buffer.indexOf('\n')
      }
    },
    flush() {
      if (buffer.length > 0) {
        const remaining = buffer
        buffer = ''
        processLine(remaining)
      }
      dispatch()
    },
  }
}
