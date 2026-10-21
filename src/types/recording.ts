export type InterviewRecorderStatus =
  'idle' | 'requesting' | 'ready' | 'recording' | 'stopping' | 'error'

/** Chỉ tồn tại trong bộ nhớ của phòng, không thuộc payload lưu câu trả lời. */
export interface InterviewRecording {
  questionId: string
  blob: Blob
  mimeType: string
  durationSeconds: number
  url: string
}
