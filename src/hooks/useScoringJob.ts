import { useEffect, useState } from 'react'

import type { InterviewRoomService, ScoringJob } from '@/types/interview'

export function useScoringJob(jobId: string | null, service: InterviewRoomService) {
  const [job, setJob] = useState<ScoringJob | null>(null)
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!jobId) return
    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()

    async function poll() {
      setIsChecking(true)
      try {
        const result = await service.getScoringJobStatus(jobId!, controller.signal)
        if (!active) return
        setJob(result)
        setError('')
        if (result.status === 'QUEUED' || result.status === 'PROCESSING') {
          // Chờ request trước hoàn tất rồi mới đặt lịch, không request chồng nhau.
          timeout = setTimeout(() => {
            void poll()
          }, 3000)
        }
      } catch (cause) {
        if (active) setError((cause as Error).message || 'Không kiểm tra được tiến độ chấm điểm.')
      } finally {
        if (active) setIsChecking(false)
      }
    }
    void poll()
    return () => {
      active = false
      controller.abort()
      clearTimeout(timeout)
    }
  }, [jobId, service, retryToken])

  function checkAgain() {
    if (!error || isChecking) return
    setError('')
    setRetryToken((token) => token + 1)
  }

  return { job: job?.jobId === jobId ? job : null, error, isChecking, checkAgain }
}
