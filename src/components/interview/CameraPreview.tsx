import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { CameraDiagnostics } from './CameraDiagnostics'

import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

interface CameraPreviewProps {
  stream: MediaStream | null
  /** Viền đỏ quanh khung khi đang ghi. */
  isRecording?: boolean
  /** Chữ hiện trong khung khi chưa có hình. */
  placeholder: string
  /** Lớp phủ ở góc khung hình: chip REC, thanh mức âm... */
  children?: ReactNode
  className?: string
}

/**
 * Khung xem trước camera. Hình được lật như soi gương cho tự nhiên;
 * bản ghi vẫn giữ chiều thật vì MediaRecorder ghi thẳng từ stream.
 */
export function CameraPreview({
  stream,
  isRecording = false,
  placeholder,
  children,
  className,
}: CameraPreviewProps) {
  const previewRef = useRef<HTMLVideoElement>(null)
  const previewAttemptRef = useRef(0)
  const [previewError, setPreviewError] = useState('')
  /** Id của stream đã có khung hình đầu tiên; video chỉ hiện dần khi đã có hình, khỏi chớp nền đen. */
  const [frameStreamId, setFrameStreamId] = useState<string | null>(null)
  const hasFrame = !!stream && frameStreamId === stream.id

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

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className={cn(
          'relative aspect-video overflow-hidden rounded-panel bg-surface-sunken ring-2 transition-shadow duration-300',
          isRecording ? 'ring-danger-600' : 'ring-border',
        )}
      >
        {stream ? (
          <video
            ref={previewRef}
            autoPlay
            muted
            playsInline
            aria-label="Xem trước camera, âm thanh xem trước được tắt"
            onLoadedData={() => setFrameStreamId(stream.id)}
            className={cn(
              'size-full -scale-x-100 object-cover transition-opacity duration-300',
              hasFrame ? 'opacity-100' : 'opacity-0',
            )}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-content-muted">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-8 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.5]"
            >
              <path d="M15 10l4.5-2.6a.6.6 0 0 1 .9.5v8.2a.6.6 0 0 1-.9.5L15 14" />
              <rect x="3" y="6" width="12" height="12" rx="2" />
              <path d="M3 3l18 18" />
            </svg>
            {placeholder}
          </div>
        )}
        {children}
      </div>

      {previewError && (
        <>
          <p
            role="alert"
            className="rounded-control bg-warning-50 px-4 py-3 text-sm text-warning-700"
          >
            {previewError}
          </p>
          <Button variant="secondary" onClick={() => void playPreview()} className="self-start">
            Hiện camera
          </Button>
        </>
      )}

      {import.meta.env.DEV && stream && <CameraDiagnostics stream={stream} videoRef={previewRef} />}
    </div>
  )
}
