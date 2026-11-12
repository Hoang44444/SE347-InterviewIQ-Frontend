import { cn } from '@/utils/cn'

export interface BrandLogoProps {
  name: string
  className?: string
}

/**
 * Logo: mặt robot AI (cùng nét với AiMascot) cạnh tên ứng dụng. Mắt chớp một lần
 * khi rê chuột vào, khớp với mascot ở trang chủ.
 */
export function BrandLogo({ name, className }: BrandLogoProps) {
  return (
    <span className={cn('group inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="10" className="fill-brand-950" />
        <rect
          x="8"
          y="9"
          width="4"
          height="8"
          rx="2"
          className="origin-center fill-brand-300 transition-transform duration-150 group-hover:scale-y-[0.2]"
        />
        <rect
          x="20"
          y="9"
          width="4"
          height="8"
          rx="2"
          className="origin-center fill-brand-300 transition-transform duration-150 group-hover:scale-y-[0.2]"
        />
        <path
          d="M10.5 21.5q5.5 3.5 11 0"
          className="fill-none stroke-brand-300 [stroke-linecap:round] [stroke-width:2]"
        />
      </svg>
      <span className="text-lg font-bold tracking-tight text-content">{name}</span>
    </span>
  )
}
