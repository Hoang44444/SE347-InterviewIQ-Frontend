import { useState } from 'react'

import { InterviewRoom } from './InterviewRoomPage'

import { Stack } from '@/components/ui'
import { createInterviewDemoService } from '@/services/interviewDemoService'

export function InterviewRoomDemoPage() {
  const [service] = useState(createInterviewDemoService)
  return (
    <Stack gap="lg">
      <p className="rounded-card bg-brand-50 px-4 py-3 text-sm text-brand-700">
        Phòng demo không cần đăng nhập. Dùng câu hỏi mẫu; câu trả lời và bản ghi chỉ được giữ trong
        phiên này, không lưu lên máy chủ.
      </p>
      <InterviewRoom id="demo" service={service} />
    </Stack>
  )
}
