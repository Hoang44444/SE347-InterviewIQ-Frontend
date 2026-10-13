import { useCallback, useEffect, useRef, useState } from 'react'

import { RecordingPlayback } from './RecordingPlayback'
import { CameraDiagnostics } from './CameraDiagnostics'

import { Badge, Button, Card, Modal, Stack } from '@/components/ui'
import type { useInterviewRecorder } from '@/hooks/useInterviewRecorder'

interface InterviewRecorderProps {
  recorder: ReturnType<typeof useInterviewRecorder>
  questionId: string
  questionNumber: number
  disabled: boolean
  className?: string
}

const STATUS_LABEL = {
  idle: 'Thiết bị đang tắt',
  requesting: 'Đang chờ quyền',
  ready: 'Camera và micro đang bật',
  recording: 'Đang ghi hình và tiếng',
  stopping: 'Đang chốt bản ghi',
  error: 'Chưa thể ghi',
} as const

export function InterviewRecorder({
  recorder,
  questionId,
  questionNumber,
  disabled,
  className,
}: InterviewRecorderProps) {
  const previewRef = useRef<HTMLVideoElement>(null)
  const previewAttemptRef = useRef(0)
  const [previewError, setPreviewError] = useState('')
  const [isRetakeOpen, setIsRetakeOpen] = useState(false)
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
  const recording = recordings[questionId]
  const isBusy = disabled || status === 'stopping'

  const playPreview = useCallback(async () => {
    const preview = previewRef.current
    if (!preview?.srcObject) return
    const attempt = ++previewAttemptRef.current
    // Tắt tiếng ở player, không tắt audio track đang được recorder sử dụng.
    preview.muted = true
    try {
      await preview.play()
      if (previewRef.current === preview && previewAttemptRef.current === attempt) {
        setPreviewError('')
      }
    } catch (cause) {
      if (previewRef.current !== preview || previewAttemptRef.current !== attempt) return
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setPreviewError(
        cause instanceof DOMException && cause.name === 'NotAllowedError'
          ? 'Trình duyệt đang chặn tự phát camera. Bấm Hiện camera; nếu vẫn bị chặn, cho phép Autoplay cho trang này trong cài đặt trình duyệt.'
          : 'Không phát được hình camera. Bấm Hiện camera để thử lại, hoặc tắt thiết bị rồi kiểm tra camera đang chọn trong trình duyệt.',
      )
    }
  }, [])

  useEffect(() => {
    const preview = previewRef.current
    if (!preview || !stream) return
    preview.srcObject = stream
    const handleMetadata = () => {
      void playPreview()
    }
    preview.addEventListener('loadedmetadata', handleMetadata)
    void playPreview()
    const frameTimeout = window.setTimeout(() => {
      if (preview.srcObject === stream && (preview.videoWidth === 0 || preview.readyState < 2)) {
        setPreviewError(
          (previous) =>
            previous ||
            'Chưa nhận được hình từ camera. Kiểm tra camera đang chọn, nắp che camera và ứng dụng khác đang dùng thiết bị; sau đó tắt thiết bị rồi bật lại.',
        )
      }
    }, 8000)
    return () => {
      previewAttemptRef.current += 1
      window.clearTimeout(frameTimeout)
      preview.removeEventListener('loadedmetadata', handleMetadata)
      preview.pause()
      preview.srcObject = null
    }
  }, [playPreview, stream])

  function handleStart() {
    if (recording) setIsRetakeOpen(true)
    else startRecording(questionId)
  }

  return (
    <Card className={className}>
      <Stack gap="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-content">Camera, micro và bản ghi</h2>
          <span role="status">
            <Badge
              tone={status === 'recording' ? 'danger' : status === 'ready' ? 'success' : 'neutral'}
            >
              {STATUS_LABEL[status]}
            </Badge>
          </span>
        </div>
        <p className="text-sm text-content-muted">
          Ghi riêng cho câu {questionNumber}. Bấm bắt đầu hoặc dừng để điều khiển bản ghi. Thời gian
          trả lời tính từ lúc mở câu đến lúc nộp, độc lập với thời lượng bản ghi.
        </p>
        {stream && (
          <Stack gap="sm">
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              aria-label="Xem trước camera, âm thanh xem trước được tắt"
              className="aspect-video w-full rounded-control bg-surface-sunken"
            />
            <p className="text-sm text-content-subtle">
              Xem trước tắt tiếng để tránh vọng âm. Bản ghi vẫn thu âm; nghe lại sau khi dừng ghi.
            </p>
            {previewError && (
              <>
                <p
                  role="alert"
                  className="rounded-control bg-warning-50 px-4 py-3 text-sm text-warning-700"
                >
                  {previewError}
                </p>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => void playPreview()}
                  className="self-start"
                >
                  Hiện camera
                </Button>
              </>
            )}
          </Stack>
        )}
        {status === 'requesting' && (
          <p className="text-sm text-content-muted">
            Cho phép cả camera và micro trong hộp quyền của trình duyệt. Cần video để nộp câu trả
            lời.
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
        {import.meta.env.DEV && <CameraDiagnostics stream={stream} videoRef={previewRef} />}
        <Stack direction="row" gap="sm" className="flex-wrap">
          {stream ? (
            <>
              {status === 'recording' || status === 'stopping' ? (
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
                <Button size="lg" onClick={handleStart} disabled={isBusy || status !== 'ready'}>
                  {recording ? 'Ghi lại' : 'Bắt đầu ghi'}
                </Button>
              )}
              <Button
                size="lg"
                variant="secondary"
                onClick={() => void disableDevices()}
                disabled={isBusy}
              >
                Tắt camera và micro
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => void enableDevices()}
                disabled={isBusy}
                isLoading={status === 'requesting'}
              >
                {status === 'requesting'
                  ? 'Đang chờ quyền'
                  : status === 'error'
                    ? 'Thử lại'
                    : 'Bật camera và micro'}
              </Button>
              {(status === 'requesting' || status === 'error') && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => void disableDevices()}
                  disabled={isBusy}
                >
                  Hủy yêu cầu thiết bị
                </Button>
              )}
            </>
          )}
        </Stack>
        <p className="text-sm text-content-subtle">
          Video là bắt buộc để nộp câu trả lời. Khi nộp, bản ghi được upload và lưu cùng transcript.
          Bản ghi chưa nộp sẽ mất khi tải lại hoặc rời phòng; tải xuống để giữ bản sao.
        </p>
        {recording && <RecordingPlayback recording={recording} questionNumber={questionNumber} />}
      </Stack>
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
                startRecording(questionId)
              }}
              disabled={isBusy || status !== 'ready'}
            >
              Bắt đầu ghi lại
            </Button>
          </>
        }
      />
    </Card>
  )
}
