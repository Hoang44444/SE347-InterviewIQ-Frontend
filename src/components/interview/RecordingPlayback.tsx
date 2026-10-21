import { Stack } from '@/components/ui'
import type { InterviewRecording } from '@/types/recording'
import { formatDuration } from '@/utils/format'

interface RecordingPlaybackProps {
  recording: InterviewRecording
  questionNumber: number
}

export function RecordingPlayback({ recording, questionNumber }: RecordingPlaybackProps) {
  const format = recording.mimeType.split(';')[0]
  const extension =
    format === 'video/webm'
      ? 'webm'
      : format === 'video/mp4'
        ? 'mp4'
        : format === 'video/ogg'
          ? 'ogv'
          : 'bin'

  return (
    <Stack gap="sm">
      <p className="text-sm font-medium text-content">
        Bản ghi câu {questionNumber} · {formatDuration(Math.round(recording.durationSeconds))}
      </p>
      <video
        key={recording.url}
        src={recording.url}
        controls
        playsInline
        preload="metadata"
        aria-label={`Xem lại bản ghi câu ${questionNumber}`}
        className="aspect-video w-full rounded-control bg-surface-sunken"
      />
      <a
        href={recording.url}
        download={`cau-${questionNumber}.${extension}`}
        className="inline-flex min-h-12 items-center self-start rounded-control px-4 text-sm font-medium text-brand-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        Tải bản ghi câu {questionNumber}
      </a>
    </Stack>
  )
}
