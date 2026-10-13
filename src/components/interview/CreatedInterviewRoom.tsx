import { Link } from 'react-router-dom'

import { Badge, Button, Card, PageHeader, Stack } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ROUTES } from '@/routes/paths'
import type { CreatedInterviewSession } from '@/types/interview'

export function CreatedInterviewRoom({ session }: { session: CreatedInterviewSession }) {
  useDocumentTitle(session.title)

  return (
    <Stack gap="lg">
      <PageHeader title={session.title} actions={<Badge tone="brand">Đã tạo</Badge>} />
      <Card padding="xl">
        <Stack gap="lg">
          <div>
            <h2 className="text-xl font-semibold text-content">Phòng phỏng vấn đã được tạo</h2>
            <p className="mt-2 text-content-muted">
              Buổi phỏng vấn đã được lưu với CV của bạn. Phòng hiện chưa có câu hỏi để bắt đầu phỏng
              vấn.
            </p>
          </div>
          {session.cvFileName && (
            <div>
              <p className="text-sm text-content-subtle">CV đã chọn</p>
              <p className="mt-1 wrap-anywhere font-medium text-content">{session.cvFileName}</p>
            </div>
          )}
          <Link to={ROUTES.interviews} className="self-start">
            <Button variant="secondary">Về danh sách</Button>
          </Link>
        </Stack>
      </Card>
    </Stack>
  )
}
