import { Card, PageHeader, Stack } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const STATS = [
  { label: 'Buổi đã hoàn thành', value: '0' },
  { label: 'Điểm trung bình', value: '-' },
  { label: 'Câu hỏi đã trả lời', value: '0' },
]

export function DashboardPage() {
  useDocumentTitle('Tổng quan')
  const { user } = useAuth()

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Xin chào, ${user?.fullName ?? 'bạn'}`}
        description="Đây là tổng quan quá trình luyện tập của bạn."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-content-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-content">{stat.value}</p>
          </Card>
        ))}
      </div>
    </Stack>
  )
}
