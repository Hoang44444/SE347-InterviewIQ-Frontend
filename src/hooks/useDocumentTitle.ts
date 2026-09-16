import { useEffect } from 'react'

import { APP_NAME } from '@/constants'

/** Đổi title của tab theo từng trang. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | ${APP_NAME}`
  }, [title])
}
