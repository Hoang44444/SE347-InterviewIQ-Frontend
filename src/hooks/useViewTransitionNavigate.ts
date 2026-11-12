import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, type To } from 'react-router-dom'

/**
 * navigate() kèm View Transitions API: trang cũ cross-fade sang trang mới.
 *
 * Prop viewTransition của react-router chỉ chạy với data router, còn app dùng
 * <BrowserRouter> nên phải tự gọi document.startViewTransition. flushSync bắt
 * React vẽ xong trang mới ngay trong callback để trình duyệt chụp được ảnh sau.
 * Trình duyệt chưa hỗ trợ thì chuyển trang bình thường.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate()

  return useCallback(
    (to: To) => {
      if (typeof document.startViewTransition !== 'function') {
        navigate(to)
        return
      }
      document.startViewTransition(() => {
        flushSync(() => navigate(to))
      })
    },
    [navigate],
  )
}
