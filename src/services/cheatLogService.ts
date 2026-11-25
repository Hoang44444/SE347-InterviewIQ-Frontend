import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

import { apiClient } from './apiClient'

import { API_URL, STORAGE_KEYS } from '@/constants'
import type { ApiError, ApiSuccessResponse } from '@/types/api'
import type {
  CheatLogAck,
  CheatLogList,
  CheatLogService,
  RecordCheatLogPayload,
  RecordCheatLogResult,
} from '@/types/cheat'
import { storage } from '@/utils/storage'

const path = (sessionPublicId: string) =>
  `/interview-session/${encodeURIComponent(sessionPublicId)}/cheat-logs`

/** Chờ ack tối đa chừng này; quá hạn thì coi là lỗi tạm thời để nơi gọi gửi lại. */
export const CHEAT_LOG_ACK_TIMEOUT_MS = 5000

/** Namespace socket.io nằm ở gốc host, cùng cổng với API (API_URL còn có tiền tố như /api). */
function socketUrl(): string {
  return `${new URL(API_URL, window.location.origin).origin}/cheat-logs`
}

/** POST và GET cũ, vẫn dùng làm đường dự phòng khi socket chưa sẵn sàng. */
export const cheatLogRestService: CheatLogService = {
  /**
   * Ghi một sự kiện. Backend loại trùng theo `clientEventId` nên gửi lại cùng id
   * là an toàn; debounce và gộp sự kiện vẫn là việc của nơi gọi.
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

/** Ack lỗi của backend về cùng dạng ApiError với REST, để nơi gọi xử lý như nhau. */
function ackToApiError(ack: Extract<CheatLogAck, { success: false }>): ApiError {
  return {
    status: ack.statusCode,
    message: ack.message,
    code: ack.code,
    errors: ack.errors && Object.fromEntries(ack.errors.map((e) => [e.field, e.messages])),
  }
}

function createSocket(): Socket {
  return io(socketUrl(), {
    autoConnect: false,
    // Hàm chứ không phải object: mỗi lần nối lại đọc token mới nhất (token có thể đã được refresh).
    auth: (callback) => callback({ token: storage.get<string>(STORAGE_KEYS.accessToken) }),
  })
}

/**
 * Gửi cheat log qua socket.io và đợi ack. Chưa nối được (đang kết nối, bị từ chối
 * Unauthorized, mất mạng) thì gửi ngay bằng REST để không rơi sự kiện nào.
 * Lỗi trong ack không đóng kết nối nên gửi tiếp được; ack quá hạn ném lỗi status 0
 * để hook gửi lại theo lịch.
 */
export function createCheatLogService(
  rest: CheatLogService,
  makeSocket: () => Socket = createSocket,
): CheatLogService {
  let socket: Socket | null = null
  let wanted = false

  return {
    list: rest.list,

    connect() {
      wanted = true
      socket ??= makeSocket()
      if (!socket.active) socket.connect()
      return () => {
        wanted = false
        socket?.disconnect()
      }
    },

    async record(sessionPublicId, payload) {
      if (!socket?.connected) {
        // Unauthorized thì socket.io không tự nối lại; thử lại ở sự kiện sau, lúc đó
        // REST đã refresh token và hàm auth đọc được token mới.
        if (wanted && socket && !socket.active) socket.connect()
        return rest.record(sessionPublicId, payload)
      }
      let ack: CheatLogAck
      try {
        ack = await socket
          .timeout(CHEAT_LOG_ACK_TIMEOUT_MS)
          .emitWithAck('cheat-log:record', { sessionPublicId, ...payload })
      } catch {
        throw {
          status: 0,
          message: 'Không nhận được phản hồi khi ghi log gian lận',
        } satisfies ApiError
      }
      if (ack.success) return ack.data
      throw ackToApiError(ack)
    },
  }
}

export const cheatLogService = createCheatLogService(cheatLogRestService)
