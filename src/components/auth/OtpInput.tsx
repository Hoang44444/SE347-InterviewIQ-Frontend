import { useId, useState, type ChangeEvent, type Ref, type SyntheticEvent } from 'react'

import { OTP_LENGTH } from '@/constants/auth'
import { cn } from '@/utils/cn'

export interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  /** Nhãn cho trình đọc màn hình; trên giao diện đã có đoạn mô tả riêng. */
  label: string
  error?: string
  disabled?: boolean
  autoFocus?: boolean
  ref?: Ref<HTMLInputElement>
}

/**
 * Ô nhập OTP trông như 6 ô rời nhưng bên dưới chỉ là MỘT thẻ input trong suốt
 * phủ lên trên. Nhờ vậy dán cả mã, tự điền mã từ email/SMS (one-time-code),
 * Backspace, bộ gõ tiếng Việt đều chạy đúng như ô nhập thường, và trình đọc
 * màn hình chỉ thấy một ô có nhãn thay vì 6 ô không tên.
 */
export function OtpInput({
  value,
  onChange,
  label,
  error,
  disabled = false,
  autoFocus,
  ref,
}: OtpInputProps) {
  const id = useId()
  const [isFocused, setIsFocused] = useState(false)
  // Ô đang chờ nhập: ô trống đầu tiên, nhập đủ rồi thì dừng ở ô cuối.
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // Dán cả câu "Mã của bạn: 012 345" vẫn lọc ra đúng 6 chữ số.
    onChange(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))
  }

  // Các ô chỉ là hình vẽ: bấm vào ô giữa không có nghĩa là chèn vào giữa,
  // nên con trỏ luôn được đẩy về cuối.
  function keepCaretAtEnd(event: SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const end = input.value.length
    if (input.selectionStart !== end || input.selectionEnd !== end) {
      input.setSelectionRange(end, end)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <div className="relative">
        <div aria-hidden className="flex gap-2">
          {Array.from({ length: OTP_LENGTH }, (_, index) => {
            const digit = value[index]
            const isActive = isFocused && index === activeIndex

            return (
              <div
                key={index}
                className={cn(
                  'flex h-12 flex-1 items-center justify-center rounded-control border bg-surface',
                  'text-xl font-semibold text-content tabular-nums transition sm:h-14 sm:text-2xl',
                  digit ? 'border-border-strong' : 'border-border',
                  isActive && 'border-brand-500 ring-2 ring-brand-100',
                  error && 'border-danger-600',
                  error && isActive && 'ring-danger-100',
                  disabled && 'bg-surface-sunken text-content-subtle',
                )}
              >
                {digit ?? (isActive && <span className="h-6 w-px animate-pulse bg-content" />)}
              </div>
            )
          })}
        </div>

        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={handleChange}
          onSelect={keepCaretAtEnd}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // text-base (16px) để Safari trên iPhone không tự phóng to khi focus.
          className="absolute inset-0 size-full cursor-text text-base opacity-0 disabled:cursor-not-allowed"
        />
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="text-center text-sm text-danger-700">
          {error}
        </p>
      )}
    </div>
  )
}
