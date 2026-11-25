import { fireEvent, render, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, expect, test } from 'vitest'

import { useViewTransitionNavigate } from './useViewTransitionNavigate'

import { TestRouter } from '@/test/TestRouter'

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition')
})

function Go() {
  const navigate = useViewTransitionNavigate()
  return <button onClick={() => navigate('/next')}>Đi</button>
}

test('the new page is on screen by the time the view transition update settles', async () => {
  let pageAtSettle: Promise<string | null> | undefined
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: (update: () => unknown) => {
      // Trình duyệt chụp ảnh trang mới ngay khi giá trị trả về của update hoàn tất.
      pageAtSettle = Promise.resolve(update()).then(() => document.body.textContent)
      return {}
    },
  })
  render(
    <TestRouter>
      <Routes>
        <Route path="/" element={<Go />} />
        <Route path="/next" element={<p>Trang tiếp theo</p>} />
      </Routes>
    </TestRouter>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Đi' }))

  expect(await pageAtSettle).toContain('Trang tiếp theo')
})
