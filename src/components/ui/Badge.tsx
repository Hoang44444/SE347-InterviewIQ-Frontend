// import type { ReactNode } from 'react'

// import { cn } from '@/utils/cn'

// const TONE_CLASS = {
//   neutral: 'bg-surface-sunken text-content-muted',
//   brand: 'bg-brand-50 text-brand-700',
//   success: 'bg-success-50 text-success-700',
//   warning: 'bg-warning-50 text-warning-700',
//   danger: 'bg-danger-50 text-danger-700',
//   info: 'bg-info-50 text-info-700',
// } as const

// export interface BadgeProps {
//   tone?: keyof typeof TONE_CLASS
//   className?: string
//   children: ReactNode
// }

// export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
//   return (
//     <span
//       className={cn(
//         'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
//         TONE_CLASS[tone],
//         className,
//       )}
//     >
//       {children}
//     </span>
//   )
// }
