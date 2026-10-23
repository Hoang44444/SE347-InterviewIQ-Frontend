import { useEffect, useState, type ReactNode } from 'react'

import { CameraPreview } from './CameraPreview'
import { MicLevelMeter } from './MicLevelMeter'
import { RecordingPlayback } from './RecordingPlayback'

import { Button, Modal } from '@/components/ui'
import type { useInterviewRecorder } from '@/hooks/useInterviewRecorder'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'

interface InterviewRecorderProps {
  recorder: ReturnType<typeof useInterviewRecorder>
  /**
   * lobby: phòng chờ, chỉ bật/tắt và kiểm tra thiết bị.
   * room: đang phỏng vấn, có nút ghi và nút hành động chính.
   * Cùng một component cho cả hai để khung camera đứng yên, không gắn lại stream.
   */
  phase: 'lobby' | 'room'
  questionId?: string
  questionNumber?: number
  disabled?: boolean
  /** Nút hành động chính đặt cùng hàng với nút ghi (Nộp câu trả lời). */
  actions?: ReactNode
  className?: string
}

const STATUS_LABEL = {
  idle: 'Camera và micro đang tắt',
  requesting: 'Đang chờ quyền',
  ready: 'Sẵn sàng ghi',
  recording: 'Đang ghi hình và tiếng',
  stopping: 'Đang chốt bản ghi',
  error: 'Chưa thể ghi',
} as const

/** Khung camera của phòng phỏng vấn: xem trước, chip REC, mức âm micro và các nút thiết bị. */
export function InterviewRecorder({
  recorder,
  phase,
  questionId = '',
  questionNumber = 1,
  disabled = false,
  actions,
  className,
}: InterviewRecorderProps) {
  const [isRetakeOpen, setIsRetakeOpen] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const {
    status,
    error,
    stream,
    recordings,
    enableDevices,
    disableDevices,
    startRecording,
    stopRecording,
  } = recorder
  const isLobby = phase === 'lobby'
  const recording = isLobby ? undefined : recordings[questionId]
  const isBusy = disabled || status === 'stopping'
  const isRecording = status === 'recording'
  const isRequesting = status === 'requesting'

  // Thời lượng hiển thị trên chip REC; bản ghi thật tự đo lại khi dừng.
  useEffect(() => {
    if (!isRecording) return
    const startedAt = performance.now()
    const timer = window.setInterval(
      () => setRecordingSeconds(Math.floor((performance.now() - startedAt) / 1000)),
      250,
    )
    return () => window.clearInterval(timer)
  }, [isRecording])

  function beginRecording() {
    setRecordingSeconds(0)
    startRecording(questionId)
  }

  function handleStart() {
    if (recording) setIsRetakeOpen(true)
    else beginRecording()
  }

  const hint = isLobby
    ? stream
      ? 'Nói thử một câu: thanh âm lượng ở góc khung hình phải nhảy theo giọng bạn. Hình được lật như soi gương, bản ghi vẫn giữ chiều thật.'
      : ''
    : isRecording
      ? 'Trả lời xong thì bấm Nộp câu trả lời, bản ghi sẽ tự dừng.'
      : recording
        ? 'Xem lại bản ghi bên dưới, hoặc ghi lại nếu chưa ưng.'
        : stream
          ? 'Bấm Bắt đầu ghi khi bạn sẵn sàng trả lời.'
          : 'Bật lại camera và micro để ghi câu trả lời. Video là bắt buộc khi nộp.'

  return (
    <section aria-label="Camera và bản ghi" className={cn('flex flex-col gap-4', className)}>
      <CameraPreview
        stream={stream}
        isRecording={isRecording}
        placeholder={
          isLobby
            ? 'Camera chưa bật. Bật camera và micro để kiểm tra hình và tiếng.'
            : 'Camera và micro đang tắt'
        }
      >
        <span role="status" className="sr-only">
          {STATUS_LABEL[status]}
        </span>
        {stream && !isLobby && (
          <span
            aria-hidden
            className={cn(
              'absolute top-3 left-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur-sm transition-colors duration-200',
              isRecording ? 'bg-danger-600' : 'bg-content/70',
            )}
          >
            {isRecording && <span className="size-2 animate-pulse rounded-full bg-white" />}
            {isRecording ? `REC ${formatDuration(recordingSeconds)}` : STATUS_LABEL[status]}
          </span>
        )}
        {stream && <MicLevelMeter stream={stream} className="absolute bottom-3 left-3" />}
      </CameraPreview>

      {isRequesting && (
        <p className="text-sm text-content-muted">
          Cho phép cả camera và micro trong hộp quyền của trình duyệt.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-control bg-warning-50 px-4 py-3 text-sm text-warning-700"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {stream ? (
            <>
              {!isLobby &&
                (isRecording || status === 'stopping' ? (
                  <Button
                    size="lg"
                    variant="danger"
                    onClick={() => void stopRecording()}
                    disabled={isBusy}
                    isLoading={status === 'stopping'}
                  >
                    {status === 'stopping' ? 'Đang chốt bản ghi' : 'Dừng ghi'}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant={recording ? 'secondary' : 'primary'}
                    onClick={handleStart}
                    disabled={isBusy || status !== 'ready'}
                  >
                    {recording ? 'Ghi lại' : 'Bắt đầu ghi'}
                  </Button>
                ))}
              <Button
                size={isLobby ? 'md' : 'lg'}
                variant={isLobby ? 'ghost' : 'secondary'}
                onClick={() => void disableDevices()}
                disabled={isBusy}
              >
                Tắt camera và micro
              </Button>
            </>
          ) : (
            <>
              <Button
                size={isLobby ? 'md' : 'lg'}
                variant={isLobby ? 'primary' : 'secondary'}
                onClick={() => void enableDevices()}
                disabled={isBusy}
                isLoading={isRequesting}
              >
                {isRequesting
                  ? 'Đang chờ quyền'
                  : status === 'error'
                    ? 'Thử lại'
                    : 'Bật camera và micro'}
              </Button>
              {(isRequesting || status === 'error') && (
                <Button
                  size={isLobby ? 'md' : 'lg'}
                  variant="ghost"
                  onClick={() => void disableDevices()}
                  disabled={isBusy}
                >
                  Hủy yêu cầu thiết bị
                </Button>
              )}
            </>
          )}
        </div>
        {actions}
      </div>

      {hint && <p className="text-sm text-content-muted">{hint}</p>}

      {recording && <RecordingPlayback recording={recording} questionNumber={questionNumber} />}

      {!isLobby && (
        <Modal
          open={isRetakeOpen}
          onClose={() => setIsRetakeOpen(false)}
          title={`Ghi lại câu ${questionNumber}`}
          description="Bản ghi mới sẽ thay thế bản ghi hiện tại khi hoàn tất và có dữ liệu. Nếu ghi lỗi hoặc rỗng, bản ghi hiện tại vẫn được giữ."
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsRetakeOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={() => {
                  setIsRetakeOpen(false)
                  beginRecording()
                }}
                disabled={isBusy || status !== 'ready'}
              >
                Bắt đầu ghi lại
              </Button>
            </>
          }
        />
      )}
    </section>
  )
}
