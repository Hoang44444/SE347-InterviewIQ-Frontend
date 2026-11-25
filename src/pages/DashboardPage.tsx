import { InsightCard, ScoreComparisonCard, ScoreTrendChart } from '@/components/dashboard'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  Stack,
  TransitionLink,
} from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useHistoryInsight } from '@/hooks/useHistoryInsight'
import { ROUTES } from '@/routes/paths'
import type { InterviewStats } from '@/types/dashboard'
import { formatScore } from '@/utils/format'

function statTiles(stats: InterviewStats | null) {
  return [
    { label: 'Buổi đã hoàn thành', value: stats ? String(stats.completedSessions) : '…' },
    {
      label: 'Điểm trung bình',
      value: stats?.averages ? formatScore(stats.averages.overallScore) : stats ? '—' : '…',
      suffix: stats?.averages ? `/${stats.maxScore}` : undefined,
    },
    {
      label: 'Điểm cao nhất',
      value: stats?.best ? formatScore(stats.best.overallScore) : stats ? '—' : '…',
      suffix: stats?.best ? `/${stats.maxScore}` : undefined,
    },
    { label: 'Câu hỏi đã trả lời', value: stats ? String(stats.answeredQuestions) : '…' },
  ]
}

export function DashboardPage() {
  useDocumentTitle('Tổng quan')
  const { user } = useAuth()
  const { stats, isLoading, loadError, reload } = useDashboardStats()
  const insight = useHistoryInsight()

  const hasScores = stats !== null && stats.completedSessions > 0

  return (
    <Stack gap="lg">
      <PageHeader
        title={`Xin chào, ${user?.fullName ?? 'bạn'}`}
        description="Đây là tổng quan quá trình luyện tập của bạn."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statTiles(stats).map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-content-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-content">
              {stat.value}
              {stat.suffix && (
                <span className="text-base font-medium text-content-subtle">{stat.suffix}</span>
              )}
            </p>
          </Card>
        ))}
      </div>

      {loadError && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-danger-700">{loadError}</p>
          <Button variant="secondary" size="sm" onClick={reload}>
            Thử lại
          </Button>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner label="Đang tải thống kê" />
        </div>
      )}

      {stats && !hasScores && (
        <EmptyState
          title="Chưa có buổi nào được chấm điểm"
          description="Hoàn thành một buổi phỏng vấn thử để xem điểm, xu hướng và so sánh theo từng tiêu chí ở đây."
          action={
            <TransitionLink
              to={ROUTES.interviews}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Bắt đầu luyện tập
            </TransitionLink>
          }
        />
      )}

      {stats && hasScores && (
        // items-start: card so sánh cao hơn, không để nó kéo card xu hướng cao theo
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <Card className="flex flex-col gap-4 lg:col-span-2">
            <div>
              <h2 className="font-semibold text-content">Xu hướng điểm</h2>
              <p className="text-sm text-content-muted">
                {stats.trend.length} buổi gần nhất, cũ nhất bên trái. Trung bình tính trên cả{' '}
                {stats.completedSessions} buổi.
              </p>
            </div>
            <ScoreTrendChart points={stats.trend} maxScore={stats.maxScore} />
          </Card>
          <ScoreComparisonCard stats={stats} />
        </div>
      )}

      <InsightCard
        state={insight.state}
        isLoading={insight.isLoading}
        loadError={insight.loadError}
        onReload={insight.reload}
        onRefresh={() => void insight.refresh()}
        isRefreshing={insight.isRefreshing}
        refreshError={insight.refreshError}
      />
    </Stack>
  )
}
