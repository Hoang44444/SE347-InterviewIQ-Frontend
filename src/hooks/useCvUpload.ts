import { useCallback, useEffect, useRef, useState } from 'react'

import { cvService } from '@/services/cvService'
import type { ApiError } from '@/types/api'
import type { Cv, CvUploadStage } from '@/types/cv'

export interface CvUploadingFile {
  name: string
  size: number
}

/**
 * Giữ trạng thái của MỘT lần upload CV: file đang gửi, bước hiện tại, % đã gửi, lỗi.
 * Mỗi lúc chỉ cho một lần upload chạy, bấm thêm file lúc đang upload sẽ bị bỏ qua.
 */
export function useCvUpload({ onUploaded }: { onUploaded: (cv: Cv) => void }) {
  const [file, setFile] = useState<CvUploadingFile | null>(null)
  const [stage, setStage] = useState<CvUploadStage>('signing')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const upload = useCallback(
    async (selected: File) => {
      if (abortRef.current) return
      const controller = new AbortController()
      abortRef.current = controller

      setError('')
      setFile({ name: selected.name, size: selected.size })
      setStage('signing')
      setProgress(0)

      try {
        const cv = await cvService.upload(selected, {
          signal: controller.signal,
          onStage: setStage,
          onProgress: setProgress,
        })
        onUploaded(cv)
      } catch (cause) {
        // Người dùng tự bấm Huỷ thì không phải lỗi, không cần báo đỏ.
        if (!controller.signal.aborted) {
          setError((cause as ApiError).message || 'Upload thất bại, hãy thử lại')
        }
      } finally {
        abortRef.current = null
        setFile(null)
      }
    },
    [onUploaded],
  )

  /** Chỉ huỷ được tới hết bước tải lên Cloudinary; sang bước lưu thì request đã đi rồi. */
  const cancel = useCallback(() => abortRef.current?.abort(), [])

  // Rời trang giữa chừng thì dừng luôn việc gửi file.
  useEffect(() => () => abortRef.current?.abort(), [])

  return { file, stage, progress, error, isUploading: file !== null, upload, cancel }
}
