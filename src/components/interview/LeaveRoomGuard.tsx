import { useCallback, useLayoutEffect, useRef } from 'react'
import { useBlocker, type BlockerFunction } from 'react-router-dom'

import { Button, Modal } from '@/components/ui'

/**
 * Hỏi lại trước khi rời phòng bằng link, menu hay nút Back trong app. Tải lại và đóng
 * tab do `beforeunload` lo, vì router không chặn được hai việc đó.
 */
export function LeaveRoomGuard({ when }: { when: boolean }) {
  /*
   * useBlocker đăng ký lại hàm chặn trong useEffect, tức sau khi màn hình đã vẽ. Đọc điều
   * kiện qua ref cập nhật ngay lúc commit để không có khoảng nào router còn dùng giá trị cũ.
   */
  const whenRef = useRef(when)
  useLayoutEffect(() => {
    whenRef.current = when
  }, [when])
  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        whenRef.current && currentLocation.pathname !== nextLocation.pathname,
      [],
    ),
  )

  return (
    <Modal
      open={blocker.state === 'blocked'}
      onClose={() => blocker.reset?.()}
      title="Rời phòng phỏng vấn?"
      description="Bản ghi chưa nộp và phần đang gõ sẽ mất. Câu đã nộp vẫn được giữ."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => blocker.reset?.()}>
            Ở lại
          </Button>
          <Button variant="danger" onClick={() => blocker.proceed?.()}>
            Rời phòng
          </Button>
        </>
      }
    />
  )
}
