import { EmotionTimeline } from './EmotionTimeline'
import { FeedbackList } from './FeedbackList'
import { ScoreBreakdownChart } from './ScoreBreakdownChart'

import { ScoreValue } from '@/components/history/ScoreValue'
import { Stack } from '@/components/ui'
import type { SessionResult } from '@/types/scoring'

export interface ScoringResultViewProps {
  result: SessionResult
}

export function ScoringResultView({ result }: ScoringResultViewProps) {
  return (
    <Stack gap="lg">
      <ScoreValue score={result.scores.overallScore} size="lg" showBar />
      <ScoreBreakdownChart scores={result.scores} />
      <FeedbackList summary={result.summary} scoredAt={result.scores.scoredAt} />
      <EmotionTimeline timeline={result.emotionTimeline ?? []} />
    </Stack>
  )
}
