import { useEffect, useRef } from 'react'

import { cn } from '@/utils/cn'

/**
 * Tâm trạng của nhân vật AI phỏng vấn:
 *  - idle: mắt dõi theo con trỏ, chống hông, thỉnh thoảng chớp mắt
 *  - happy: mắt cười, má ửng, nghiêng đầu, vẫy tay
 *  - listening: đang ghi hình, đèn ăng-ten đỏ như đèn REC (đứng yên, chip REC đã nhấp nháy), gật gù
 *  - thinking: đang lưu câu trả lời, mắt nhìn lên, miệng mím
 */
export type AiMascotMood = 'idle' | 'happy' | 'listening' | 'thinking'

/* Mắt liếc xa nhất chừng này (đơn vị viewBox) để không lọt ra khỏi màn hình mặt. */
const MAX_LOOK = 7

/*
 * Tay hai đoạn (vai → khuỷu → bàn tay), toạ độ viewBox. Lúc thường chống hông.
 * Lúc vui: cánh tay phải giơ lên, cẳng tay dựng đứng rồi vẫy quanh khuỷu.
 * Góc xoay tính sẵn để cẳng tay hướng gần thẳng lên trên (-80°).
 */
const ARMS = {
  left: {
    shoulder: [72, 216],
    elbow: [39, 231],
    hand: [60, 248],
    shoulderOrigin: 'origin-[72px_216px]',
    elbowOrigin: 'origin-[39px_231px]',
    upperRaised: '',
    foreRaised: '',
  },
  right: {
    shoulder: [168, 216],
    elbow: [201, 231],
    hand: [180, 248],
    shoulderOrigin: 'origin-[168px_216px]',
    elbowOrigin: 'origin-[201px_231px]',
    upperRaised: '-rotate-[65deg]',
    foreRaised: '-rotate-[156deg]',
  },
} as const

const ARM_STROKE = 'stroke-brand-600 [stroke-linecap:round] [stroke-width:11]'

function Arm({ side, isHappy }: { side: keyof typeof ARMS; isHappy: boolean }) {
  const arm = ARMS[side]
  const [shoulderX, shoulderY] = arm.shoulder
  const [elbowX, elbowY] = arm.elbow
  const [handX, handY] = arm.hand
  const isWaving = isHappy && side === 'right'

  return (
    <g
      className={cn(
        'transition-transform duration-500 ease-spring transform-view',
        arm.shoulderOrigin,
        isHappy && arm.upperRaised,
      )}
    >
      {/* Lúc thường tay đứng yên: chuyển động lặp không mang nghĩa gì chỉ làm phân tâm. */}
      <g>
        <line x1={shoulderX} y1={shoulderY} x2={elbowX} y2={elbowY} className={ARM_STROKE} />

        <g
          className={cn(
            'transition-transform duration-500 ease-spring transform-view',
            arm.elbowOrigin,
            isHappy && arm.foreRaised,
          )}
        >
          {/* Vẫy tay: cẳng tay lắc qua lại quanh khuỷu. */}
          <g className={cn('transform-view', arm.elbowOrigin, isWaving && 'animate-wave-hand')}>
            <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} className={ARM_STROKE} />
            <circle cx={handX} cy={handY} r="10" className="fill-brand-200" />
          </g>
        </g>

        <circle cx={elbowX} cy={elbowY} r="5" className="fill-brand-700" />
      </g>
      <circle cx={shoulderX} cy={shoulderY} r="7" className="fill-brand-700" />
    </g>
  )
}

export interface AiMascotProps {
  mood?: AiMascotMood
  className?: string
}

/** Hình nhân vật AI phỏng vấn (chỉ để trang trí, aria-hidden). */
export function AiMascot({ mood = 'idle', className }: AiMascotProps) {
  const faceRef = useRef<SVGSVGElement>(null)
  const isHappy = mood === 'happy'
  const isThinking = mood === 'thinking'
  const isListening = mood === 'listening'

  // Mắt dõi theo con trỏ ở bất kỳ đâu trên trang. Ghi vào CSS variable để không render lại.
  useEffect(() => {
    let frame = 0
    function handleMove(event: globalThis.PointerEvent) {
      if (event.pointerType !== 'mouse') return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const svg = faceRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const dx = event.clientX - (rect.left + rect.width / 2)
        const dy = event.clientY - (rect.top + rect.height / 2)
        const distance = Math.hypot(dx, dy) || 1
        const reach = Math.min(distance / 200, 1) * MAX_LOOK
        svg.style.setProperty('--look-x', `${(dx / distance) * reach}px`)
        svg.style.setProperty('--look-y', `${(dy / distance) * reach}px`)
      })
    }
    window.addEventListener('pointermove', handleMove)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    // viewBox bắt đầu từ y=14 để cắt khoảng trống phía trên ăng-ten.
    <svg
      ref={faceRef}
      viewBox="0 14 240 246"
      aria-hidden
      className={cn('w-full overflow-visible', className)}
    >
      {/* Thân: đứng yên, chỉ có đầu và tay chuyển động. */}
      <rect x="104" y="196" width="32" height="16" rx="4" className="fill-border-strong" />
      <rect x="64" y="206" width="112" height="40" rx="18" className="fill-brand-600" />
      <text x="120" y="231" textAnchor="middle" className="fill-white text-xs font-bold">
        IQ
      </text>

      <g
        className={cn(
          'origin-bottom transition-transform duration-500 ease-spring transform-fill',
          isHappy && '-rotate-6',
          isListening && 'animate-nod',
        )}
      >
        {/* Ăng-ten: sáng khi vui, đỏ như đèn REC khi đang ghi, nhấp nháy khi đang nghĩ. */}
        <line
          x1="120"
          y1="30"
          x2="120"
          y2="54"
          className="stroke-border-strong [stroke-linecap:round] [stroke-width:4]"
        />
        <circle
          cx="120"
          cy="26"
          r="8"
          className={cn(
            'origin-center transform-fill',
            isHappy ? 'animate-ping fill-brand-500 opacity-60' : 'opacity-0',
          )}
        />
        <circle
          cx="120"
          cy="26"
          r="8"
          className={cn(
            'transition-colors duration-300',
            isListening ? 'fill-danger-600' : isHappy ? 'fill-brand-500' : 'fill-brand-300',
            isThinking && 'animate-pulse',
          )}
        />

        {/* Tai và đầu */}
        <rect x="22" y="100" width="16" height="44" rx="7" className="fill-brand-200" />
        <rect x="202" y="100" width="16" height="44" rx="7" className="fill-brand-200" />
        <rect
          x="34"
          y="52"
          width="172"
          height="148"
          rx="40"
          className="fill-surface stroke-border-strong [stroke-width:2]"
        />

        {/* Màn hình mặt */}
        <rect x="54" y="72" width="132" height="100" rx="28" className="fill-brand-950" />

        <g
          className="transition-transform duration-150 ease-out"
          style={{
            // Lúc nghĩ thì mắt nhìn lên góc trên, không dõi theo con trỏ.
            transform: isThinking
              ? 'translate(5px, -8px)'
              : 'translate(var(--look-x, 0px), var(--look-y, 0px))',
          }}
        >
          {/* Mắt thường: chớp đều. */}
          <g
            className={cn('transition-opacity duration-200', isHappy ? 'opacity-0' : 'opacity-100')}
          >
            <g className="origin-center animate-blink transform-fill">
              <rect x="86" y="100" width="16" height="28" rx="8" className="fill-brand-300" />
              <rect x="138" y="100" width="16" height="28" rx="8" className="fill-brand-300" />
            </g>
            <path
              d={isThinking ? 'M110 150 L130 150' : 'M110 148 Q120 155 130 148'}
              className="fill-none stroke-brand-300 [stroke-linecap:round] [stroke-width:4]"
            />
          </g>

          {/* Mắt cười ^ ^, miệng mở, má ửng. */}
          <g
            className={cn('transition-opacity duration-200', isHappy ? 'opacity-100' : 'opacity-0')}
          >
            <path
              d="M84 120 Q94 104 104 120 M136 120 Q146 104 156 120"
              className="fill-none stroke-brand-300 [stroke-linecap:round] [stroke-width:5]"
            />
            <path d="M106 140 Q120 164 134 140 Z" className="fill-brand-300" />
            <circle cx="76" cy="138" r="8" className="fill-danger-100 opacity-80" />
            <circle cx="164" cy="138" r="8" className="fill-danger-100 opacity-80" />
          </g>
        </g>
      </g>

      {/* Vẽ sau đầu để tay giơ lên nằm phía trước mặt. */}
      <Arm side="left" isHappy={isHappy} />
      <Arm side="right" isHappy={isHappy} />
    </svg>
  )
}
