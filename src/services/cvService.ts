import axios from 'axios'

import { apiClient } from './apiClient'

import {
  CV_MIME_TYPE,
  CV_UPLOAD_TIMEOUT,
  MAX_CV_FILE_NAME_LENGTH,
  MAX_CV_SIZE_BYTES,
} from '@/constants/cv'
import type { ApiError, ApiSuccessResponse } from '@/types/api'
import type { CreateCvPayload, Cv, CvSignedParams, CvSummary, CvUploadOptions } from '@/types/cv'

/** Lỗi phát sinh ở FE (chưa gọi backend), cùng dạng ApiError để UI xử lý một kiểu. */
function clientError(message: string): ApiError {
  return { status: 0, message }
}

/** Kiểm tra sớm cho người dùng biết ngay. Backend vẫn kiểm tra lại, đây không phải lớp bảo mật. */
function validateCvFile(file: File): ApiError | null {
  if (file.type !== CV_MIME_TYPE) return clientError('Chỉ nhận file PDF')
  if (file.size === 0) return clientError('File rỗng')
  if (file.size > MAX_CV_SIZE_BYTES) return clientError('File vượt quá 5 MB')
  if (file.name.length > MAX_CV_FILE_NAME_LENGTH) return clientError('Tên file quá dài')
  return null
}

export const cvService = {
  /** Bước 1: xin backend "giấy phép" upload một file PDF lên Cloudinary. */
  async getSignedParams(): Promise<CvSignedParams> {
    const { data } = await apiClient.post<ApiSuccessResponse<CvSignedParams>>('/cvs/signed-params')
    return data.data
  },

  /**
   * Bước 2: gửi file thẳng từ trình duyệt lên Cloudinary, file không đi qua backend.
   * Dùng axios thường chứ KHÔNG dùng apiClient: apiClient tự gắn JWT của mình vào header,
   * gửi sang Cloudinary là lộ token cho bên thứ ba.
   */
  async uploadToCloudinary(
    file: File,
    params: CvSignedParams,
    options: Pick<CvUploadOptions, 'onProgress' | 'signal'> = {},
  ): Promise<void> {
    // Tên field phải đúng chuẩn Cloudinary, và mọi field đã ký phải gửi y nguyên.
    const form = new FormData()
    form.append('file', file)
    form.append('api_key', params.apiKey)
    form.append('timestamp', String(params.timestamp))
    form.append('signature', params.signature)
    form.append('public_id', params.cloudinaryPublicId)
    form.append('allowed_formats', params.allowedFormats)

    try {
      // Không tự đặt Content-Type: trình duyệt tự thêm multipart/form-data kèm boundary.
      await axios.post(params.uploadUrl, form, {
        timeout: CV_UPLOAD_TIMEOUT,
        signal: options.signal,
        onUploadProgress: (event) => {
          if (event.total) {
            options.onProgress?.(Math.round((event.loaded / event.total) * 100))
          }
        },
      })
    } catch (error) {
      if (axios.isCancel(error)) throw clientError('Đã huỷ upload')
      // Cloudinary trả lỗi dạng { error: { message } }, không phải envelope của backend.
      const message = axios.isAxiosError<{ error?: { message?: string } }>(error)
        ? error.response?.data?.error?.message
        : undefined
      throw clientError(message ? `Upload thất bại: ${message}` : 'Upload thất bại')
    }
  },

  /** Bước 3: báo backend lưu CV. Backend tự hỏi Cloudinary dung lượng/định dạng thật. */
  async create(payload: CreateCvPayload): Promise<Cv> {
    const { data } = await apiClient.post<ApiSuccessResponse<Cv>>('/cvs', payload)
    return data.data
  },

  /**
   * Gộp cả 3 bước: kiểm tra file → xin chữ ký → upload → lưu.
   * Trang upload chỉ cần gọi hàm này.
   */
  async upload(file: File, options: CvUploadOptions = {}): Promise<Cv> {
    const invalid = validateCvFile(file)
    if (invalid) throw invalid

    options.onStage?.('signing')
    const params = await cvService.getSignedParams()

    options.onStage?.('uploading')
    await cvService.uploadToCloudinary(file, params, options)

    options.onStage?.('saving')
    return cvService.create({
      fileName: file.name,
      cloudinaryPublicId: params.cloudinaryPublicId,
    })
  },

  /** CV của người dùng hiện tại, mới nhất trước. */
  async list(): Promise<CvSummary[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<CvSummary[]>>('/cvs')
    return data.data
  },

  /** 404 nếu CV không tồn tại hoặc thuộc người khác. */
  async getById(publicId: string): Promise<Cv> {
    const { data } = await apiClient.get<ApiSuccessResponse<Cv>>(
      `/cvs/${encodeURIComponent(publicId)}`,
    )
    return data.data
  },
}
