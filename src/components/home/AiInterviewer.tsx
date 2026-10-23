import { useState, type MouseEvent, type PointerEvent } from 'react'

import { AiMascot } from '@/components/brand/AiMascot'
import { cn } from '@/utils/cn'

/**
 * Nhân vật AI phỏng vấn ở hero trang chủ.
 *  - Bình thường: mắt dõi theo con trỏ, thỉnh thoảng chớp, bong bóng thoại "đang gõ".
 *  - Rê chuột vào (hoặc chạm, hoặc Enter khi focus): mắt cười, má ửng, nghiêng đầu,
 *    vẫy tay, đèn ăng-ten sáng và lên tiếng chào.
 */
export function AiInterviewer() {
  const [isHappy, setIsHappy] = useState(false)

  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse') setIsHappy(true)
  }

  function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse') setIsHappy(false)
  }

  // Màn hình cảm ứng không có hover: chạm để đổi biểu cảm.
  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse') setIsHappy((happy) => !happy)
  }

  // detail = 0 nghĩa là click sinh ra từ bàn phím (Enter/Space).
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail === 0) setIsHappy((happy) => !happy)
  }

  return (
    <div className="mx-auto w-full max-w-60">
      <div
        aria-hidden
        className={cn(
          'relative mx-auto mb-4 grid rounded-card border bg-surface px-4 py-3 text-center text-sm shadow-popover transition-colors duration-300',
          isHappy ? 'border-brand-200' : 'border-border',
        )}
      >
        <span
          className={cn(
            'col-start-1 row-start-1 flex items-center justify-center gap-1 transition-opacity duration-200',
            isHappy && 'opacity-0',
          )}
        >
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 animate-bounce rounded-full bg-content-subtle"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span
          className={cn(
            'col-start-1 row-start-1 text-content transition duration-300 ease-out-soft',
            isHappy ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
          )}
        >
          Chào bạn! Mình sẽ phỏng vấn bạn hôm nay.
        </span>
        <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b border-inherit bg-surface" />
      </div>

      <button
        type="button"
        aria-label="Chào người phỏng vấn AI"
        aria-pressed={isHappy}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        className="mx-auto block w-full max-w-48 cursor-pointer rounded-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
      >
        <AiMascot mood={isHappy ? 'happy' : 'idle'} />
      </button>
    </div>
  )
}
