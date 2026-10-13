import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  const items = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, String(value)),
    removeItem: (key: string) => items.delete(key),
    clear: () => items.clear(),
  })
})

HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
HTMLDialogElement.prototype.close = function () {
  this.open = false
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
