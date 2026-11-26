import { fireEvent, render, screen } from '@testing-library/react'
import { useLayoutEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { expect, test } from 'vitest'

import { LeaveRoomGuard } from './LeaveRoomGuard'

import { TestRouter } from '@/test/TestRouter'

/** Chuyển trang ngay khi vừa vẽ xong, sớm hơn mọi useEffect của lượt render đó. */
function LeaveImmediately() {
  const navigate = useNavigate()
  useLayoutEffect(() => {
    void navigate('/elsewhere')
  }, [navigate])
  return null
}

function Room({ blockedAtFirst }: { blockedAtFirst: boolean }) {
  const [isBlocking, setIsBlocking] = useState(blockedAtFirst)
  const [isLeaving, setIsLeaving] = useState(false)
  return (
    <>
      <LeaveRoomGuard when={isBlocking} />
      <button
        onClick={() => {
          setIsBlocking(!blockedAtFirst)
          setIsLeaving(true)
        }}
      >
        Đổi và đi
      </button>
      {isLeaving && <LeaveImmediately />}
    </>
  )
}

function open(blockedAtFirst: boolean) {
  render(
    <TestRouter>
      <Routes>
        <Route path="/" element={<Room blockedAtFirst={blockedAtFirst} />} />
        <Route path="/elsewhere" element={<p>Đã rời phòng</p>} />
      </Routes>
    </TestRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Đổi và đi' }))
}

test('stops blocking as soon as the screen shows there is nothing left to lose', async () => {
  open(true)

  expect(await screen.findByText('Đã rời phòng')).toBeInTheDocument()
})

test('starts blocking as soon as there is something to lose', async () => {
  open(false)

  expect(await screen.findByRole('heading', { name: 'Rời phòng phỏng vấn?' })).toBeInTheDocument()
  expect(screen.queryByText('Đã rời phòng')).not.toBeInTheDocument()
})
