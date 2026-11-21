/**
 * Kiểu dữ liệu của module CV, khớp 1-1 với DTO backend
 * (SE347-InterviewIQ-Backend/src/modules/cv/application/dtos/cv.response.dto.ts).
 * Backend đổi DTO thì phải sửa ở đây theo.
 */

export type ParseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/** Hình dạng `parsedData` (bản sao của CvParsedData bên backend). Danh sách rỗng là [], không bao giờ null. */
export interface CvParsedData {
  summary: string | null
  skills: {
    languages: string[]
    frameworks: string[]
    databases: string[]
    tools: string[]
  }
  experiences: {
    company: string
    position: string
    /** Dạng "YYYY-MM". */
    startDate: string | null
    /** null nghĩa là vẫn đang làm ở đó. */
    endDate: string | null
    description: string | null
    technologies: string[]
  }[]
  education: {
    institution: string
    degree: string | null
    graduationYear: number | null
  }[]
  projects: {
    name: string
    description: string | null
    role: string | null
  }[]
}

/** Một dòng trong danh sách CV (GET /cvs): không có fileUrl, parsedData cho nhẹ. */
export interface CvSummary {
  publicId: string
  fileName: string
  /** Dung lượng tính bằng byte. */
  fileSize: number
  parseStatus: ParseStatus
  isActive: boolean
  /** Chuỗi ISO 8601. */
  createdAt: string
}

/** Chi tiết một CV (GET /cvs/:id và kết quả của POST /cvs). */
export interface Cv extends CvSummary {
  fileUrl: string
  /** null cho tới khi parse xong (Sprint 3). */
  parsedData: CvParsedData | null
  updatedAt: string
}

/** Vì sao một lần phân tích kết thúc ở FAILED (khớp ParseFailureReason bên backend). */
export type ParseFailureReason = 'FILE_UNAVAILABLE' | 'FILE_UNREADABLE' | 'NO_TEXT' | 'AI_FAILED'

/**
 * Kết quả của POST /cvs/:id/parse: CV kèm lý do nếu phân tích hỏng.
 * failureReason chỉ có trong response này, GET lại sau đó sẽ không còn.
 */
export interface CvParseResult extends Cv {
  failureReason: ParseFailureReason | null
}

/** Giấy phép upload thẳng lên Cloudinary (POST /cvs/signed-params). */
export interface CvSignedParams {
  uploadUrl: string
  apiKey: string
  /** Unix time tính bằng giây. Chữ ký hết hạn sau 1 giờ. */
  timestamp: number
  signature: string
  /** Gửi lên Cloudinary với tên `public_id`, rồi gửi lại cho backend khi lưu CV. */
  cloudinaryPublicId: string
  /** Gửi lên Cloudinary với tên `allowed_formats`. */
  allowedFormats: string
  /** Gửi lên Cloudinary với tên `asset_folder`. */
  assetFolder: string
}

export interface CreateCvPayload {
  fileName: string
  cloudinaryPublicId: string
}

/** Các bước của một lần upload, để UI hiện đúng trạng thái. */
export type CvUploadStage = 'signing' | 'uploading' | 'saving'

export interface CvUploadOptions {
  /** Phần trăm đã gửi lên Cloudinary, 0 → 100. */
  onProgress?: (percent: number) => void
  onStage?: (stage: CvUploadStage) => void
  /** Truyền signal của AbortController để cho phép nút "Huỷ". */
  signal?: AbortSignal
}
