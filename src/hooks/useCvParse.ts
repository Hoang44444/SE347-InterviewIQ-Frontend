import { useCallback, useRef, useState } from 'react'

import { useToast } from '@/hooks/useToast'
import { cvService } from '@/services/cvService'
import type { ApiError } from '@/types/api'
import type { Cv } from '@/types/cv'

/**
 * Gọi phân tích CV và nhớ CV nào đang được phân tích để UI hiện "Đang phân tích".
 * Một CV chỉ chạy một lần phân tích tại một thời điểm.
 */
export function useCvParse({ onChanged }: { onChanged: (cv: Cv) => void }) {
  const toast = useToast()
  const [parsingIds, setParsingIds] = useState<string[]>([])
  const inFlight = useRef(new Set<string>())

  const parse = useCallback(
    async (publicId: string) => {
      if (inFlight.current.has(publicId)) return
      inFlight.current.add(publicId)
      setParsingIds((previous) => [...previous, publicId])

      try {
        const cv = await cvService.parse(publicId)
        onChanged(cv)
        if (cv.parseStatus === 'COMPLETED') {
          toast.success('Đã phân tích CV', cv.fileName)
        } else {
          toast.error('Không đọc được nội dung CV', cv.fileName)
        }
      } catch (cause) {
        toast.error('Không phân tích được CV', (cause as ApiError).message)
        // Request lỗi nhưng backend có thể đã chạy xong (hoặc đang chạy): hỏi lại trạng thái thật.
        try {
          onChanged(await cvService.getById(publicId))
        } catch {
          // Giữ nguyên trạng thái đang hiện.
        }
      } finally {
        inFlight.current.delete(publicId)
        setParsingIds((previous) => previous.filter((id) => id !== publicId))
      }
    },
    [onChanged, toast],
  )

  return { parsingIds, parse }
}
