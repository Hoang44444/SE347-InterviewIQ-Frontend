import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { cn } from '@/utils/cn'

/*
 * Đèn chỉ bật sáng dần ở lần đầu vào trang. Chuyển qua lại giữa các trang
 * sau đó thì đèn đã sáng sẵn, không chớp lại.
 */
let hasLitUp = false

/**
 * Mức độ của nền studio:
 *  - stage: trang chủ, đủ đèn chính, 3 luồng sáng, bụi sáng và bokeh, dịch theo chuột
 *  - soft: đăng nhập/đăng ký, 2 luồng sáng hai bên và ít bụi để form vẫn là trọng tâm
 *  - quiet: các trang làm việc, chỉ còn quầng đèn tĩnh, không chuyển động
 *  - dim: 404, phòng tắt đèn, đèn chập chờn và vài hạt bụi
 */
export type StudioLight = 'stage' | 'soft' | 'quiet' | 'dim'

interface Beam {
  /** Vị trí đèn trên trần, tính theo bề ngang màn hình. */
  left: string
  /** Nửa độ mở của nón sáng. */
  spread: number
  /** Góc nghiêng giữa nhịp lắc. */
  angle: number
  duration: string
  /** Âm để mỗi luồng bắt đầu ở một pha khác nhau, không lắc đồng loạt. */
  delay: string
  /** Độ gần: luồng gần dịch theo chuột nhiều hơn. */
  depth: number
}

const BEAMS: Beam[] = [
  { left: '20%', spread: 9, angle: 18, duration: '26s', delay: '-6s', depth: 1.4 },
  { left: '52%', spread: 12, angle: -3, duration: '34s', delay: '-14s', depth: 1 },
  { left: '82%', spread: 8, angle: -20, duration: '22s', delay: '-9s', depth: 1.6 },
]

const SETTINGS: Record<StudioLight, { beams: Beam[]; motes: number; bokeh: number }> = {
  stage: { beams: BEAMS, motes: 1, bokeh: 7 },
  soft: { beams: [BEAMS[0], BEAMS[2]], motes: 0.45, bokeh: 0 },
  quiet: { beams: [], motes: 0, bokeh: 0 },
  dim: { beams: [], motes: 0.3, bokeh: 0 },
}

interface Mote {
  x: number
  y: number
  /** Bán kính vẽ, px. */
  r: number
  /** Tốc độ bay lên, px/giây. */
  speed: number
  phase: number
  alpha: number
  depth: number
}

/**
 * Ảnh một đốm sáng mềm vẽ sẵn một lần, mỗi khung hình chỉ việc dán lại cho nhẹ:
 * dán nhỏ ra hạt bụi, dán lớn ra bokeh.
 *
 * Gradient chỉ dùng để tạo độ trong suốt; màu được tô sau bằng source-in. Nếu cho
 * gradient chạy thẳng từ màu sáng tới transparent (tức đen trong suốt), canvas pha
 * qua xám và đốm sáng thành vòng tròn có viền sẫm.
 */
function createSprite(color: string) {
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 64
  const context = sprite.getContext('2d')
  if (!context) return null
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'black')
  gradient.addColorStop(0.3, 'black')
  gradient.addColorStop(1, 'transparent')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  context.globalCompositeOperation = 'source-in'
  context.fillStyle = color
  context.fillRect(0, 0, 64, 64)
  return sprite
}

export interface StudioBackdropProps {
  light?: StudioLight
}

/** Nền studio phủ toàn màn hình, nằm sau nội dung trang. */
export function StudioBackdrop({ light = 'stage' }: StudioBackdropProps) {
  const [shouldLightUp] = useState(() => !hasLitUp)
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const settings = SETTINGS[light]
  const hasMotes = settings.motes > 0

  useEffect(() => {
    hasLitUp = true
  }, [])

  /*
   * Một vòng requestAnimationFrame duy nhất lo cả hai việc: làm mượt vị trí chuột
   * cho parallax (ghi vào --parallax-x/-y, các lớp CSS tự dịch theo) và vẽ bụi sáng.
   * Không setState nên React không render lại. Tab ẩn thì trình duyệt tự dừng vòng lặp.
   */
  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const { beams, motes: moteDensity, bokeh } = SETTINGS[light]
    if (!root || (moteDensity === 0 && beams.length === 0)) return

    // Gán lại để kiểu không-null đi được vào các hàm khai báo bên dưới.
    const backdrop: HTMLDivElement = root
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const context = canvas?.getContext('2d') ?? null
    if (!context && (reduceMotion || beams.length === 0)) return

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let width = 0
    let height = 0
    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      if (canvas && context) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }
    resize()

    const color =
      getComputedStyle(backdrop).getPropertyValue('--color-light-mote').trim() || 'white'
    const sprite = context ? createSprite(color) : null

    // Bụi tập trung phía trên, nơi có đèn; bokeh ít, to và ở gần hơn.
    function spawn(isBokeh: boolean, initial: boolean): Mote {
      const depth = isBokeh ? 1.2 + Math.random() * 0.6 : 0.3 + Math.random() * 0.7
      return {
        x: Math.random() * width,
        y: initial ? height * Math.pow(Math.random(), 1.4) : height + 30,
        r: isBokeh ? 12 + Math.random() * 22 : (0.8 + Math.random() * 1.4) * (0.6 + depth),
        speed: isBokeh ? 2 + Math.random() * 3 : 4 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        alpha: isBokeh ? 0.22 + Math.random() * 0.2 : 0.55 + Math.random() * 0.45,
        depth,
      }
    }
    const moteCount = Math.round(Math.min(70, Math.max(24, (width * height) / 20000)) * moteDensity)
    const particles = [
      ...Array.from({ length: moteCount }, () => ({ mote: spawn(false, true), isBokeh: false })),
      ...Array.from({ length: bokeh }, () => ({ mote: spawn(true, true), isBokeh: true })),
    ]

    // Hạt chỉ sáng khi nằm trong quầng đèn; ra xa nguồn sáng thì tắt dần.
    const isDim = light === 'dim'
    function lightAt(x: number, y: number) {
      const sourceY = isDim ? -height * 0.1 : 0
      const radius = isDim ? Math.max(width * 0.35, height * 0.6) : Math.max(width * 0.6, height)
      const falloff = 1 - Math.hypot(x - width / 2, y - sourceY) / radius
      return falloff <= 0 ? 0 : Math.pow(falloff, 1.2)
    }

    function draw(time: number, offsetX: number, offsetY: number) {
      if (!context || !sprite) return
      context.clearRect(0, 0, width, height)
      for (const { mote, isBokeh } of particles) {
        const x = mote.x - offsetX * mote.depth * 18
        const y = mote.y - offsetY * mote.depth * 10
        const lit = lightAt(x, y)
        if (lit < 0.01) continue
        const twinkle = isBokeh ? 1 : 0.65 + 0.35 * Math.sin(time * (0.8 + mote.depth) + mote.phase)
        const size = isBokeh ? mote.r * 2 : mote.r * 4
        context.globalAlpha = mote.alpha * lit * twinkle
        context.drawImage(sprite, x - size / 2, y - size / 2, size, size)
      }
    }

    // Giảm chuyển động: vẽ một khung tĩnh, không parallax, không vòng lặp.
    if (reduceMotion) {
      draw(0, 0, 0)
      return
    }

    const pointer = { x: 0, y: 0 }
    const smooth = { x: 0, y: 0 }
    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      pointer.x = (event.clientX / width) * 2 - 1
      pointer.y = (event.clientY / height) * 2 - 1
    }

    let frame = 0
    let last = performance.now()
    function tick(now: number) {
      // Kẹp dt để quay lại tab sau một lúc lâu không làm hạt nhảy cóc.
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const ease = Math.min(1, dt * 3)
      const nextX = smooth.x + (pointer.x - smooth.x) * ease
      const nextY = smooth.y + (pointer.y - smooth.y) * ease
      if (Math.abs(nextX - smooth.x) > 0.0005 || Math.abs(nextY - smooth.y) > 0.0005) {
        backdrop.style.setProperty('--parallax-x', nextX.toFixed(3))
        backdrop.style.setProperty('--parallax-y', nextY.toFixed(3))
      }
      smooth.x = nextX
      smooth.y = nextY

      const seconds = now / 1000
      for (const particle of particles) {
        const { mote } = particle
        mote.y -= mote.speed * dt
        mote.x += Math.sin(seconds * 0.4 + mote.phase) * 6 * dt
        if (mote.y < -mote.r * 2) particle.mote = spawn(particle.isBokeh, false)
      }
      draw(seconds, smooth.x, smooth.y)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('resize', resize)
    }
  }, [light])

  return (
    // view-transition-name đặt ở khung ngoài để cả nền đứng yên khi chuyển trang,
    // chỉ nội dung cross-fade.
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden [view-transition-name:studio-light]"
    >
      {/*
       * Đèn chính. Lớp ngoài bật đèn lần đầu, lớp trong thở chậm và dịch nhẹ theo chuột.
       * Tràn ra ngoài khung 5% để lúc dịch ngang không lộ mép quầng sáng.
       */}
      <div
        className={cn(
          'absolute -inset-[5%] origin-top',
          light !== 'dim' && shouldLightUp && 'animate-lights-on',
        )}
      >
        <div
          className={cn(
            'absolute inset-0 origin-top',
            light === 'dim' && 'animate-flicker bg-studio-dim',
            light === 'quiet' && 'bg-studio-light opacity-60',
            (light === 'stage' || light === 'soft') && 'animate-key-breathe bg-studio-light',
          )}
          style={{
            translate: 'calc(var(--parallax-x, 0) * 10px) calc(var(--parallax-y, 0) * 6px)',
          }}
        />
      </div>

      {settings.beams.map((beam) => (
        <div
          key={beam.left}
          className="absolute -top-16 h-[115vh] w-[70rem] origin-top animate-beam-sway bg-studio-beam will-change-transform"
          style={
            {
              left: beam.left,
              marginLeft: '-35rem',
              transform: `rotate(${beam.angle}deg)`,
              translate: `calc(var(--parallax-x, 0) * ${-14 * beam.depth}px) 0`,
              animationDuration: beam.duration,
              animationDelay: beam.delay,
              '--beam-angle': `${beam.angle}deg`,
              '--beam-spread': `${beam.spread}deg`,
            } as CSSProperties
          }
        />
      ))}

      {hasMotes && <canvas ref={canvasRef} className="absolute inset-0 size-full" />}

      <div className="absolute inset-0 bg-studio-vignette" />
      <div className="absolute inset-0 bg-grain" />
    </div>
  )
}
