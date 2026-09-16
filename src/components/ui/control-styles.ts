/**
 * Class dùng chung cho mọi ô nhập liệu (Input, Textarea, Select).
 * Tách ra file .ts để 3 component không tự vẽ mỗi kiểu một khác nhau.
 */
export const CONTROL_BASE =
  'w-full rounded-control border border-border bg-surface px-3 text-sm text-content ' +
  'transition placeholder:text-content-subtle ' +
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-content-subtle'

/** Khi field có lỗi thì viền và vòng focus đổi sang màu danger. */
export const CONTROL_INVALID = 'border-danger-600 focus:border-danger-600 focus:ring-danger-100'
