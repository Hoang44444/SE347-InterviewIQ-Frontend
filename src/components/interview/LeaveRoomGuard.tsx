import { useBlocker } from 'react-router-dom'

import { Button, Modal } from '@/components/ui'

/**
 * Hỏi lại trước khi rời phòng bằng link, menu hay nút Back trong app. Tải lại và đóng
 * tab do `beforeunload` lo, vì router không chặn được hai việc đó.
 */
export function LeaveRoomGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
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
