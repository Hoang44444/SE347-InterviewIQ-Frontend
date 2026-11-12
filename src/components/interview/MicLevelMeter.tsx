import { useEffect, useRef } from 'react'

import { cn } from '@/utils/cn'

const BAR_COUNT = 8

/** Nối stream vào AnalyserNode; trình duyệt không hỗ trợ thì trả về null và ẩn thanh đo. */
function connectAnalyser(stream: MediaStream) {
  if (typeof AudioContext === 'undefined' || stream.getAudioTracks().length === 0) return null
  try {
    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    return { context, source, analyser }
  } catch {
    return null
  }
}

interface MicLevelMeterProps {
  stream: MediaStream
  className?: string
}

/**
 * Thanh mức âm micro đặt đè lên khung camera, để người dùng thấy micro
 * đang thu tiếng. Cập nhật thẳng data-on của từng vạch mỗi khung hình,
 * không setState để khỏi render lại 60 lần một giây.
 */
export function MicLevelMeter({ stream, className }: MicLevelMeterProps) {
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = barsRef.current
    const audio = connectAnalyser(stream)
    if (!container || !audio) return

    const { analyser } = audio
    const samples = new Uint8Array(analyser.fftSize)
    const bars = Array.from(container.children) as HTMLElement[]
    let frame = 0
    function tick() {
      analyser.getByteTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) {
        const value = (sample - 128) / 128
        sum += value * value
      }
      // Giọng nói thường chỉ đạt RMS 0,02–0,2 nên nhân lên cho thanh dễ nhìn.
      const level = Math.min(1, Math.sqrt(sum / samples.length) * 5)
      bars.forEach((bar, index) => {
        bar.dataset.on = String(level > index / BAR_COUNT)
      })
      frame = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(frame)
      audio.source.disconnect()
      void audio.context.close()
    }
  }, [stream])

  return (
    <div
      aria-hidden
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-content/70 px-3 py-1.5 text-white backdrop-blur-sm',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-width:1.75]"
      >
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
      </svg>
      <div ref={barsRef} className="flex h-4 items-end gap-0.5">
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <span
            key={index}
            className="w-1 rounded-full bg-white/25 transition-colors duration-75 data-[on=true]:bg-success-600"
            style={{ height: `${30 + index * 10}%` }}
          />
        ))}
      </div>
    </div>
  )
}
