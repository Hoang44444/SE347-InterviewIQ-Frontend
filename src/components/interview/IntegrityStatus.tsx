import { Badge } from '@/components/ui'
import { INTEGRITY_LABEL } from '@/constants/integrity'
import type { FaceDetectorState, IntegrityEventType } from '@/types/integrity'

export interface IntegrityStatusProps {
  activeTypes: IntegrityEventType[]
  eventCount: number
  detectorState: FaceDetectorState
}

/** Báo cho người dùng biết hệ thống đang giám sát và đang thấy gì, để họ tự chỉnh lại. */
export function IntegrityStatus({ activeTypes, eventCount, detectorState }: IntegrityStatusProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-content-muted">
        <span>
          {detectorState === 'loading'
            ? 'Đang tải bộ nhận diện khuôn mặt…'
            : detectorState === 'unavailable'
              ? 'Không bật được nhận diện khuôn mặt, vẫn ghi nhận rời tab và thoát toàn màn hình.'
              : 'Hệ thống đang ghi nhận các tín hiệu bất thường để người xem xét.'}
        </span>
        {eventCount > 0 && <Badge tone="warning">{eventCount} cảnh báo</Badge>}
      </div>
      {activeTypes.length > 0 && (
        <ul
          role="status"
          aria-live="polite"
          className="flex flex-col gap-1 rounded-control bg-warning-50 px-4 py-3 text-sm text-warning-700"
        >
          {activeTypes.map((type) => (
            <li key={type}>{INTEGRITY_LABEL[type]}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
