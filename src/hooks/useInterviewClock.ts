import { useEffect, useState } from 'react'

import { createInterviewClock } from '@/utils/interviewClock'

export function useInterviewClock(isRunning: boolean) {
  const [clock] = useState(() => createInterviewClock())
  const [elapsed, setElapsed] = useState({ sessionSeconds: 0, questionSeconds: 0 })

  useEffect(() => {
    if (!isRunning) return
    const interval = window.setInterval(() => setElapsed(clock.snapshot()), 200)
    return () => window.clearInterval(interval)
  }, [clock, isRunning])

  return { clock, elapsed }
}
