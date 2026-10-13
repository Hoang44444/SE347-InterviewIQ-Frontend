import { useEffect, useState, type RefObject } from 'react'

interface CameraDiagnosticsProps {
  stream: MediaStream | null
  videoRef: RefObject<HTMLVideoElement | null>
}

interface CameraSnapshot {
  label: string
  trackState: string
  attached: boolean
  width: number
  height: number
  paused: boolean
  currentTime: string
}

/** Thông tin local để kiểm tra camera thật trên route development; không đọc ảnh hay log device ID. */
export function CameraDiagnostics({ stream, videoRef }: CameraDiagnosticsProps) {
  const [snapshot, setSnapshot] = useState<CameraSnapshot | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      const track = stream?.getVideoTracks()[0]
      const video = videoRef.current
      setSnapshot({
        label: track?.label || (track ? 'Camera không có tên' : 'Chưa mở camera'),
        trackState: !track
          ? 'Không có video track'
          : track.readyState === 'ended'
            ? 'Đã ngắt'
            : !track.enabled
              ? 'Đang tắt'
              : track.muted
                ? 'Chưa gửi tín hiệu hình'
                : 'Đang hoạt động',
        attached: !!stream && video?.srcObject === stream,
        width: video?.videoWidth ?? 0,
        height: video?.videoHeight ?? 0,
        paused: video?.paused ?? true,
        currentTime: (video?.currentTime ?? 0).toFixed(1),
      })
    }, 500)
    return () => window.clearInterval(timer)
  }, [stream, videoRef])

  return (
    <details open className="rounded-control border border-border bg-surface-muted px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-content">
        Thông tin camera · development
      </summary>
      {snapshot ? (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-content-subtle">Camera đang dùng</dt>
            <dd className="break-words text-content">{snapshot.label}</dd>
          </div>
          <div>
            <dt className="text-content-subtle">Tín hiệu camera</dt>
            <dd className="text-content">{snapshot.trackState}</dd>
          </div>
          <div>
            <dt className="text-content-subtle">Stream gắn vào preview</dt>
            <dd className="text-content">{snapshot.attached ? 'Đã gắn' : 'Chưa gắn'}</dd>
          </div>
          <div>
            <dt className="text-content-subtle">Hình nhận được</dt>
            <dd className="text-content">
              {snapshot.width > 0
                ? `Đã nhận hình (${snapshot.width} × ${snapshot.height})`
                : 'Chưa nhận được hình'}
            </dd>
          </div>
          <div>
            <dt className="text-content-subtle">Trạng thái preview</dt>
            <dd className="text-content">{snapshot.paused ? 'Chưa phát' : 'Đang phát'}</dd>
          </div>
          <div>
            <dt className="text-content-subtle">Thời gian hình chạy</dt>
            <dd className="font-mono text-content">{snapshot.currentTime} giây</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-content-subtle">Đang kiểm tra camera…</p>
      )}
    </details>
  )
}
