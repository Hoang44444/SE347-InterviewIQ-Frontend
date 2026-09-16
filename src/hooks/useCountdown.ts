import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Nhịp kiểm tra đồng hồ. Nhỏ hơn 1s để con số trên màn hình không bị nhảy
 * cách quãng khi nhịp của setInterval lệch dần so với đồng hồ hệ thống.
 */
const TICK_MS = 200

function toWholeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0
  return Math.max(0, Math.ceil(seconds))
}

export interface UseCountdownOptions {
  /** Chạy ngay khi component mount. */
  autoStart?: boolean
  /** Gọi đúng một lần khi đồng hồ về 0. */
  onExpire?: () => void
}

export interface Countdown {
  secondsLeft: number
  isRunning: boolean
  start: () => void
  pause: () => void
  /** Nạp lại đồng hồ với độ dài mới, dùng khi chuyển sang câu hỏi khác. */
  reset: (seconds: number, autoStart?: boolean) => void
}

/**
 * Đồng hồ đếm ngược tính theo mốc thời gian tuyệt đối (deadline) chứ không
 * cộng dồn từng nhịp. Nhờ vậy tab bị treo, bị ngủ hay nhịp interval trễ đều
 * không làm đồng hồ chạy sai — mỗi nhịp chỉ đọc lại hiệu số với mốc đó.
 *
 *   const { secondsLeft, isRunning, start, pause, reset } = useCountdown(120)
 */
export function useCountdown(
  initialSeconds: number,
  { autoStart = false, onExpire }: UseCountdownOptions = {},
): Countdown {
  const [secondsLeft, setSecondsLeft] = useState(() => toWholeSeconds(initialSeconds))
  const [isRunning, setIsRunning] = useState(() => autoStart && toWholeSeconds(initialSeconds) > 0)

  /**
   * Mốc hết giờ theo Date.now(). Bằng 0 nghĩa là đồng hồ đang dừng.
   * Không chốt mốc ngay tại đây: Date.now() là hàm không thuần, gọi trong
   * thân component sẽ cho kết quả khác nhau mỗi lần render.
   */
  const deadlineRef = useRef(0)
  /** Số giây còn lại lúc dừng, để bấm Tiếp tục thì chạy tiếp từ đúng chỗ đó. */
  const remainingRef = useRef(toWholeSeconds(initialSeconds))
  /** Giữ callback mới nhất trong ref để effect đếm giờ không phải chạy lại. */
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    if (!isRunning) return

    // Lần chạy đầu tiên (autoStart) chưa có mốc hết giờ thì chốt ngay bây giờ.
    if (deadlineRef.current === 0) {
      deadlineRef.current = Date.now() + remainingRef.current * 1000
    }

    const id = window.setInterval(() => {
      // Đã hết giờ ở nhịp trước nhưng React chưa kịp render lại: bỏ qua.
      if (deadlineRef.current === 0) return

      const left = toWholeSeconds((deadlineRef.current - Date.now()) / 1000)
      remainingRef.current = left
      setSecondsLeft(left)

      if (left === 0) {
        deadlineRef.current = 0
        setIsRunning(false)
        onExpireRef.current?.()
      }
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [isRunning])

  const start = useCallback(() => {
    if (remainingRef.current <= 0) return
    deadlineRef.current = Date.now() + remainingRef.current * 1000
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    if (deadlineRef.current > 0) {
      remainingRef.current = toWholeSeconds((deadlineRef.current - Date.now()) / 1000)
      deadlineRef.current = 0
      setSecondsLeft(remainingRef.current)
    }
    setIsRunning(false)
  }, [])

  const reset = useCallback((seconds: number, shouldAutoStart = false) => {
    const next = toWholeSeconds(seconds)
    remainingRef.current = next
    setSecondsLeft(next)

    const willRun = shouldAutoStart && next > 0
    deadlineRef.current = willRun ? Date.now() + next * 1000 : 0
    setIsRunning(willRun)
  }, [])

  return { secondsLeft, isRunning, start, pause, reset }
}
