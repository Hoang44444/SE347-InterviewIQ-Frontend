export type CvParseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/** GET /cvs chỉ trả CV thuộc tài khoản trong access token. */
export interface CvSummary {
  publicId: string
  fileName: string
  fileSize: number
  parseStatus: CvParseStatus
  isActive: boolean
  createdAt: string
}
