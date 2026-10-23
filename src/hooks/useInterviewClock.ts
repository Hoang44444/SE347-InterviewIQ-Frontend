import { useEffect, useState } from 'react'

import { createInterviewClock } from '@/utils/interviewClock'

export function useInterviewClock(isRunning: boolean) {
  const [clock] = useState(() => createInterviewClock())
  const [elapsed, setElapsed] = useState({ sessionSeconds: 0, questionSeconds: 0 })

  useEffect(() => {
    if (!isRunning) return
    // Đọc đồng hồ 5 lần/giây cho đúng giờ, nhưng chỉ cập nhật state khi số giây đổi:
    // trả lại object cũ thì React bỏ qua, cả phòng phỏng vấn chỉ render lại 1 lần/giây.
    const interval = window.setInterval(() => {
      const next = clock.snapshot()
      setElapsed((previous) =>
        previous.sessionSeconds === next.sessionSeconds &&
        previous.questionSeconds === next.questionSeconds
          ? previous
          : next,
      )
    }, 200)
    return () => window.clearInterval(interval)
  }, [clock, isRunning])

  return { clock, elapsed }
}
