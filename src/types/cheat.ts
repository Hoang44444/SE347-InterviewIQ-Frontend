/** Loại sự kiện backend nhận ở POST /interview-session/:id/cheat-logs. */
export type CheatEventType = 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FACE_MISSING' | 'MULTIPLE_FACES'

export interface CheatLog {
  id: string
  eventType: CheatEventType
  /** null khi lúc ghi không gửi description. */
  description: string | null
  /** Giờ phía client lúc phát hiện, ISO 8601 UTC. */
  occurredAt: string
  createdAt: string
}

export interface CheatSummary {
  totalCount: number
  /** Luôn đủ 4 key, loại chưa xảy ra có giá trị 0. */
  countsByType: Record<CheatEventType, number>
}

export interface RecordCheatLogPayload {
  eventType: CheatEventType
  occurredAt: string
  /** Tối đa 500 ký tự. */
  description?: string
}

export interface RecordCheatLogResult {
  log: CheatLog
  summary: CheatSummary
}

export interface CheatLogList {
  logs: CheatLog[]
  summary: CheatSummary
}

/** Tách riêng để phòng phỏng vấn dùng được dữ liệu mẫu mà không gọi backend. */
export interface CheatLogService {
  record: (sessionPublicId: string, payload: RecordCheatLogPayload) => Promise<RecordCheatLogResult>
  list: (sessionPublicId: string) => Promise<CheatLogList>
}
