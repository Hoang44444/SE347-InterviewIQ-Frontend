import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Gộp class Tailwind, class sau ghi đè class trước khi bị trùng nhóm.
 * VD: cn('p-2', condition && 'p-4') -> 'p-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
