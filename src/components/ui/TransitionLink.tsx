import type { MouseEvent } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate'

export type TransitionLinkProps = Omit<LinkProps, 'to'> & { to: string }

/**
 * Link chuyển trang có hiệu ứng cross-fade. Ctrl/Cmd/Shift + click hay
 * chuột giữa vẫn mở tab mới như link thường.
 */
export function TransitionLink({ to, onClick, ...rest }: TransitionLinkProps) {
  const navigateWithTransition = useViewTransitionNavigate()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    const isPlainClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    if (event.defaultPrevented || !isPlainClick || rest.target === '_blank') return
    event.preventDefault()
    navigateWithTransition(to)
  }

  return <Link to={to} onClick={handleClick} {...rest} />
}
