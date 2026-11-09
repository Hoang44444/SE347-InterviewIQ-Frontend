import { apiClient } from './apiClient'

import type { ApiSuccessResponse } from '@/types/api'
import type {
  CheatLogList,
  CheatLogService,
  RecordCheatLogPayload,
  RecordCheatLogResult,
} from '@/types/cheat'

const path = (sessionPublicId: string) =>
  `/interview-session/${encodeURIComponent(sessionPublicId)}/cheat-logs`

export const cheatLogService: CheatLogService = {
  /**
   * Ghi một sự kiện. Backend không chống trùng nên mỗi lần gọi là một bản ghi;
   * debounce và gộp sự kiện là việc của nơi gọi.
   */
  async record(
    sessionPublicId: string,
    payload: RecordCheatLogPayload,
  ): Promise<RecordCheatLogResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<RecordCheatLogResult>>(
      path(sessionPublicId),
      payload,
    )
    return data.data
  },

  /** Lấy lại toàn bộ log và bộ đếm của buổi; gọi được ở mọi trạng thái. */
  async list(sessionPublicId: string): Promise<CheatLogList> {
    const { data } = await apiClient.get<ApiSuccessResponse<CheatLogList>>(path(sessionPublicId))
    return data.data
  },
}
