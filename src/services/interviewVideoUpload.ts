import type { InterviewRecordingSignedParams } from '@/types/interview'
import type { InterviewRecording } from '@/types/recording'

export function validateInterviewVideo(blob: Blob, maxFileSizeBytes?: number) {
  const format = blob.type.split(';')[0].trim().toLowerCase()
  if (blob.size === 0) throw new Error('Bản ghi không có dữ liệu. Hãy ghi video trước khi nộp.')
  if (format !== 'video/mp4' && format !== 'video/webm') {
    throw new Error('Chỉ hỗ trợ bản ghi MP4 hoặc WebM. Hãy dùng trình duyệt khác để ghi lại.')
  }
  if (maxFileSizeBytes !== undefined && blob.size > maxFileSizeBytes) {
    throw new Error('Video vượt giới hạn dung lượng. Hãy ghi lại video ngắn hơn.')
  }
  return format
}

/** Upload trực tiếp, không dùng apiClient chứa bearer token của ứng dụng. */
export async function uploadInterviewVideo(
  params: InterviewRecordingSignedParams,
  recording: InterviewRecording,
): Promise<string> {
  const format = validateInterviewVideo(recording.blob, params.maxFileSizeBytes)
  const form = new FormData()
  form.append('file', recording.blob, format === 'video/mp4' ? 'answer.mp4' : 'answer.webm')
  form.append('api_key', params.apiKey)
  form.append('timestamp', String(params.timestamp))
  form.append('signature', params.signature)
  form.append('public_id', params.cloudinaryPublicId)
  form.append('allowed_formats', params.allowedFormats)
  form.append('overwrite', String(params.overwrite))
  const response = await fetch(params.uploadUrl, {
    method: 'POST',
    body: form,
    credentials: 'omit',
  })
  if (!response.ok) throw new Error('Không upload được video. Hãy thử lại.')
  const asset: { public_id?: string } = await response.json()
  if (asset.public_id !== params.cloudinaryPublicId) {
    throw new Error('Video upload không khớp mã đã ký. Hãy thử upload lại.')
  }
  return asset.public_id
}
