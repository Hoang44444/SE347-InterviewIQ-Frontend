import { FACE_MODEL_URL, MEDIAPIPE_WASM_URL } from '@/constants/integrity'
import type { FaceObservation } from '@/types/integrity'
import { headPoseFromMatrix } from '@/utils/faceConditions'

export interface FaceDetector {
  /** Phân tích một khung hình; timestamp phải tăng dần giữa các lần gọi. */
  detect(video: HTMLVideoElement, now: number): FaceObservation
  close(): void
}

/**
 * Nạp MediaPipe Face Landmarker khi cần (dynamic import để không nặng bundle chính).
 * Mọi xử lý chạy trên máy người dùng, không gửi hình đi đâu.
 */
export async function createFaceDetector(): Promise<FaceDetector> {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL)
  const options = {
    runningMode: 'VIDEO' as const,
    numFaces: 2,
    outputFacialTransformationMatrixes: true,
  }
  let landmarker
  try {
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
    })
  } catch {
    // Máy không hỗ trợ GPU delegate: chạy CPU, chậm hơn nhưng vẫn đủ cho 2 lần/giây.
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'CPU' },
    })
  }
  const instance = landmarker
  let lastTimestamp = -1

  return {
    detect(video, now) {
      // MediaPipe yêu cầu timestamp tăng nghiêm ngặt.
      lastTimestamp = Math.max(Math.round(now), lastTimestamp + 1)
      const result = instance.detectForVideo(video, lastTimestamp)
      const matrix = result.facialTransformationMatrixes?.[0]?.data
      const pose = result.faceLandmarks.length === 1 && matrix ? headPoseFromMatrix(matrix) : null
      return {
        time: now,
        faceCount: result.faceLandmarks.length,
        yawDeg: pose?.yawDeg ?? null,
        pitchDeg: pose?.pitchDeg ?? null,
      }
    },
    close() {
      instance.close()
    },
  }
}
