import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, expect, test } from 'vitest'

import { apiClient } from './apiClient'
import { DASHBOARD_TREND_LIMIT, dashboardService } from './dashboardService'

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
