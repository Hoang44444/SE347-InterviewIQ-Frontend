import { useCallback, useEffect, useRef } from 'react'

import { EMOTION_BASELINE_SAMPLE_COUNT, EMOTION_SAMPLE_INTERVAL_MS } from '@/constants/emotion'
import { FACE_SAMPLE_INTERVAL_MS } from '@/constants/integrity'
import type { Blendshapes, EmotionSample, EmotionSummary } from '@/types/emotion'
import type { FaceObservation } from '@/types/integrity'
import { classifyEmotion, computeBaseline } from '@/utils/emotionClassifier'
import { summarizeEmotion } from '@/utils/emotionSummary'
import { classifyFace } from '@/utils/faceConditions'

/** Mẫu thô của một lần quan sát; việc phân loại chờ đến khi đã có mức nền. */
interface RawSample {
  time: number
  /** null khi không có đúng một khuôn mặt hoặc không có điểm blendshape. */
  blendshapes: Blendshapes | null
  gazeAway: boolean
}

export interface UseEmotionCollectorOptions {
  /** Câu hỏi đang trả lời; mẫu gắn vào câu này. */
  questionId?: string
  /** Chỉ thu mẫu trong lúc đang ghi hình câu trả lời. */
  recording: boolean
}

/**
 * Thu mẫu biểu cảm cho từng câu trả lời từ vòng nhận diện mặt có sẵn của `useIntegrityMonitor`
 * (dùng chung một detector, không nạp model lần hai). Chỉ lấy 1 mẫu mỗi
 * EMOTION_SAMPLE_INTERVAL_MS, và chỉ giữ điểm số: không lưu hình ảnh nào.
 *
 * Mẫu của một câu được xóa mỗi khi bắt đầu ghi lại câu đó, nên tóm tắt luôn khớp với bản ghi
 * sẽ được nộp. Mức nền lấy từ vài mẫu hợp lệ đầu tiên của cả phiên.
 */
export function useEmotionCollector({ questionId, recording }: UseEmotionCollectorOptions) {
  const samplesRef = useRef(new Map<string, RawSample[]>())
  const baselineFramesRef = useRef<Blendshapes[]>([])
  const lastSampleRef = useRef(Number.NEGATIVE_INFINITY)
  const stateRef = useRef({ questionId, recording })

  useEffect(() => {
    stateRef.current = { questionId, recording }
    if (recording && questionId) {
      // Bắt đầu ghi (lại) câu này: bỏ mẫu của lần ghi trước.
      samplesRef.current.delete(questionId)
      lastSampleRef.current = Number.NEGATIVE_INFINITY
    }
  }, [questionId, recording])

  /** Truyền cho `useIntegrityMonitor` làm `onObservation`. */
  const onObservation = useCallback((observation: FaceObservation) => {
    const { questionId: current, recording: isRecording } = stateRef.current
    if (!current || !isRecording) return
    // Vòng nhận diện chạy dày hơn chu kỳ mẫu; nửa nhịp dung sai cho độ trôi của setInterval.
    if (
      observation.time - lastSampleRef.current <
      EMOTION_SAMPLE_INTERVAL_MS - FACE_SAMPLE_INTERVAL_MS / 2
    )
      return
    lastSampleRef.current = observation.time

    const blendshapes = observation.faceCount === 1 ? (observation.blendshapes ?? null) : null
    const raw: RawSample = {
      time: observation.time,
      blendshapes,
      gazeAway: blendshapes !== null && classifyFace(observation).includes('LOOKING_AWAY'),
    }
    const samples = samplesRef.current.get(current) ?? []
    samples.push(raw)
    samplesRef.current.set(current, samples)
    if (blendshapes && baselineFramesRef.current.length < EMOTION_BASELINE_SAMPLE_COUNT) {
      baselineFramesRef.current.push(blendshapes)
    }
  }, [])

  /**
   * Tóm tắt biểu cảm của một câu để gửi cùng câu trả lời; null khi không đủ dữ liệu.
   * Không xóa mẫu: nộp lỗi rồi thử lại vẫn gửi lại đúng bản tóm tắt.
   */
  const summarize = useCallback((target: string): EmotionSummary | null => {
    const raw = samplesRef.current.get(target)
    if (!raw?.length) return null
    const baseline = computeBaseline(baselineFramesRef.current)
    const samples: EmotionSample[] = raw.map((sample) => ({
      time: sample.time,
      state: sample.blendshapes ? classifyEmotion(sample.blendshapes, baseline) : null,
      gazeAway: sample.gazeAway,
    }))
    return summarizeEmotion(samples, EMOTION_SAMPLE_INTERVAL_MS)
  }, [])

  return { onObservation, summarize }
}
