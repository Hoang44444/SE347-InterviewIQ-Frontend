import { useState } from 'react'

import { cn } from '@/utils/cn'

const SIZE_CLASS = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-24 text-2xl',
} as const

export interface AvatarProps {
  /** null hoặc undefined khi người dùng chưa có ảnh: hiện chữ viết tắt của tên. */
  src?: string | null
  /** Tên để đọc cho trình đọc màn hình và lấy chữ viết tắt. */
  name: string
  size?: keyof typeof SIZE_CLASS
  className?: string
}

/** Chữ đầu của hai từ đầu tiên: "Lê Hữu Việt Hoàng" thành "LH". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

/**
 * Ảnh đại diện tròn, tự lùi về chữ viết tắt khi chưa có ảnh hoặc ảnh tải lỗi.
 * Luôn tự mang nhãn: ở thanh điều hướng hẹp, avatar là thứ duy nhất đại diện
 * cho người dùng vì tên bị ẩn.
 */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  // Nhớ đúng URL đã lỗi chứ không nhớ một cờ boolean: URL đổi sau mỗi lần
  // upload nên ảnh mới phải được thử tải lại từ đầu.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)

  const shape = cn('shrink-0 rounded-full object-cover', SIZE_CLASS[size], className)
  const label = `Ảnh đại diện của ${name}`

  if (!src || src === brokenSrc) {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          shape,
          'inline-flex items-center justify-center bg-brand-100 font-semibold text-brand-700',
        )}
      >
        {initialsOf(name)}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={label}
      // Ảnh nằm trên Cloudinary: link hỏng hay mạng chặn thì vẫn còn chữ viết tắt.
      onError={() => setBrokenSrc(src)}
      className={cn(shape, 'border border-border bg-surface-sunken')}
    />
  )
}
