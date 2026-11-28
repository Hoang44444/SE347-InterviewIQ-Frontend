import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, expect, test } from 'vitest'

import { apiClient } from './apiClient'
import {
  DASHBOARD_TREND_LIMIT,
  EMPTY_DASHBOARD_RANGE,
  dashboardService,
  hasActiveDateRange,
} from './dashboardService'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

/** Giả backend: ghi lại request rồi trả về envelope thành công. */
function recordRequests(data: unknown): InternalAxiosRequestConfig[] {
  const requests: InternalAxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    return {
      data: { statusCode: 200, success: true, data, message: 'OK', timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  return requests
}

test('thống kê xin đúng số buổi cho biểu đồ xu hướng', async () => {
  const requests = recordRequests({ completedSessions: 0 })

  const stats = await dashboardService.getStats()

  expect(stats).toEqual({ completedSessions: 0 })
  expect(requests[0].method).toBe('get')
  expect(requests[0].url).toBe('/interviews/stats')
  expect(requests[0].params).toEqual({ limit: DASHBOARD_TREND_LIMIT })
})

/** GET không bao giờ làm backend gọi AI; chỉ POST mới tốn lượt. */
test('đọc nhận xét bằng GET, tạo lại bằng POST', async () => {
  const requests = recordRequests({ insight: null })

  await dashboardService.getInsight()
  await dashboardService.refreshInsight()

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['get', '/interviews/insight'],
    ['post', '/interviews/insight'],
  ])
})

/**
 * Backend lọc theo mốc thời gian tuyệt đối còn <input type="date"> chỉ cho một
 * ngày theo lịch người dùng. Test đọc lại mốc ISO theo giờ địa phương nên không
 * phụ thuộc múi giờ của máy chạy test.
 */
test('lọc khoảng ngày: quy đổi sang đầu ngày và cuối ngày địa phương', async () => {
  const requests = recordRequests({ completedSessions: 2 })

  await dashboardService.getStats({ fromDate: '2026-10-01', toDate: '2026-10-20' })

  const params = requests[0].params as Record<string, string | number>
  expect(params.limit).toBe(DASHBOARD_TREND_LIMIT)

  const from = new Date(params.fromDate as string)
  expect([from.getMonth(), from.getDate(), from.getHours(), from.getMinutes()]).toEqual([
    9, 1, 0, 0,
  ])

  const to = new Date(params.toDate as string)
  expect([to.getDate(), to.getHours(), to.getSeconds(), to.getMilliseconds()]).toEqual([
    20, 23, 59, 999,
  ])
})

/** `?fromDate=` bị backend trả 400, nên mốc để trống phải biến mất khỏi query. */
test('mốc ngày để trống thì không nằm trong query', async () => {
  const requests = recordRequests({ completedSessions: 2 })

  await dashboardService.getStats({ fromDate: '', toDate: '2026-10-20' })

  expect(Object.keys(requests[0].params as object).sort()).toEqual(['limit', 'toDate'])
})

test('khoảng ngày đảo chiều bị chặn ở frontend, không gọi backend', async () => {
  const requests = recordRequests({ completedSessions: 2 })

  await expect(
    dashboardService.getStats({ fromDate: '2026-10-20', toDate: '2026-10-01' }),
  ).rejects.toMatchObject({ status: 0, message: '"Từ ngày" phải trước hoặc bằng "Đến ngày"' })
  expect(requests).toHaveLength(0)
})

test('chỉ cần một mốc ngày cũng tính là đang lọc', () => {
  expect(hasActiveDateRange(EMPTY_DASHBOARD_RANGE)).toBe(false)
  expect(hasActiveDateRange({ fromDate: '2026-10-01', toDate: '' })).toBe(true)
  expect(hasActiveDateRange({ fromDate: '', toDate: '2026-10-20' })).toBe(true)
})
