import { Badge, Card, PageHeader, Stack } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function ProfilePage() {
  useDocumentTitle('Hồ sơ')
  const { user } = useAuth()

  return (
    <Stack gap="lg">
      <PageHeader title="Hồ sơ cá nhân" />

      <Card className="max-w-lg">
        <Stack gap="md">
          <div>
            <p className="text-sm text-content-subtle">Họ tên</p>
            <p className="mt-0.5 font-medium text-content">{user?.fullName ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-content-subtle">Email</p>
            <p className="mt-0.5 font-medium text-content">{user?.email ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-content-subtle">Vai trò</p>
            <div className="mt-1">
              <Badge tone="brand">{user?.role ?? 'chưa rõ'}</Badge>
            </div>
          </div>
        </Stack>
      </Card>
    </Stack>
  )
}
