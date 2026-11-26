import type { CheatLog, CheatSummary } from '@/types/cheat'
import type { InterviewSessionStatus, QuestionDifficulty, QuestionDomain } from '@/types/interview'

/**
 * Một dòng trong danh sách lịch sử (GET /interviews).
 *
 * Item KHÔNG có jobDescription: cột đó là text dài, backend chỉ trả ở API chi
 * tiết để payload danh sách không phình ra vì dữ liệu màn này không hiện.
 */
export interface InterviewHistoryItem {
  id: string
  title: string
  status: InterviewSessionStatus
  totalQuestions: number
  /** null khi buổi phỏng vấn chưa được nộp. */
  durationSeconds: number | null
  /** Thang 0-10. null khi chưa chấm xong. */
  overallScore: number | null
  startedAt: string | null
  completedAt: string | null
  /** Mốc backend dùng để sắp xếp và để lọc theo khoảng thời gian. */
  createdAt: string
  /** Tính lúc đọc: true khi buổi có ít nhất 1 cheat log. */
  isFlagged: boolean
  cheatEventCount: number
}

/** CV gắn với buổi phỏng vấn. Chỉ có tên file, không có nội dung đã parse. */
export interface InterviewHistoryCv {
  id: string
  fileName: string
}

/**
 * Câu trả lời đã nộp cho một câu hỏi.
 *
 * videoUrl là link Cloudinary backend trả về sau khi lưu câu trả lời; null khi
 * asset đã bị xoá hoặc response không kèm link phát lại.
 */
export interface InterviewHistoryAnswer {
  videoUrl: string | null
  /** Chuỗi rỗng là câu trả lời không có lời; null khi response không kèm transcript. */
  transcript: string | null
  /** Thời lượng video do backend xác minh, không phải thời gian người dùng nghĩ. */
  durationSeconds: number | null
}

/**
 * Một câu hỏi của buổi, kèm câu trả lời nếu đã nộp.
 *
 * domain và difficulty nhận null vì lớp chuẩn hoá ở `parseHistoryQuestions` hạ
 * về null khi giá trị trả về không khớp enum đã biết — UI bỏ badge tương ứng
 * chứ không coi cả câu hỏi là dữ liệu lỗi.
 */
export interface InterviewHistoryQuestion {
  /** publicId của câu hỏi. */
  id: string
  /** Thứ tự backend gán. Chỉ dùng để sắp xếp, không dùng làm số hiển thị. */
  orderIndex: number
  content: string
  domain: QuestionDomain | null
  difficulty: QuestionDifficulty | null
  /** null khi câu chưa được trả lời, hoặc response không kèm phần trả lời. */
  answer: InterviewHistoryAnswer | null
}

/**
 * Chi tiết một buổi phỏng vấn (GET /interviews/:id).
 *
 * score và summary là khung backend chừa sẵn cho module khác đổ dữ liệu vào
 * sau; hiện luôn trả null. Để kiểu `unknown` thay vì một shape đoán trước:
 * `unknown` buộc phải narrow nên không ai vô tình đọc
 * detail.score.overallScore trên dữ liệu đang là null, và khi backend đổ dữ
 * liệu thật thì chỉ thay kiểu ở đây, shape của response không đổi.
 */
export interface InterviewHistoryDetail {
  id: string
  title: string
  /** null khi người dùng không nhập mô tả công việc. */
  jobDescription: string | null
  status: InterviewSessionStatus
  totalQuestions: number
  durationSeconds: number | null
  startedAt: string | null
  submittedAt: string | null
  completedAt: string | null
  createdAt: string
  /** null khi buổi không gắn CV, hoặc CV đã bị xoá (quan hệ onDelete: SetNull). */
  cv: InterviewHistoryCv | null
  score: unknown
  summary: unknown
  /** Luôn là mảng, không bao giờ null. */
  questions: InterviewHistoryQuestion[]
  isFlagged: boolean
  cheatSummary: CheatSummary
  /** Luôn là mảng, sắp theo occurredAt tăng dần. */
  cheatLogs: CheatLog[]
}

/**
 * Bộ lọc người dùng đang chọn. Hai mốc ngày ở dạng yyyy-MM-dd đúng như
 * <input type="date"> trả về; service mới đổi sang ISO 8601 UTC.
 *
 * Backend không hỗ trợ tìm theo từ khoá và không lọc theo khoảng điểm, nên
 * không có field nào cho hai thứ đó.
 */
export interface InterviewHistoryFilter {
  status: InterviewSessionStatus | ''
  fromDate: string
  toDate: string
}

/** Query gửi lên backend. Mọi field đều tuỳ chọn trừ phân trang. */
export interface InterviewHistoryQuery {
  pageNumber: number
  pageSize: number
  status?: InterviewSessionStatus
  /** ISO 8601, lọc createdAt >= fromDate. */
  fromDate?: string
  /** ISO 8601, lọc createdAt <= toDate, bao gồm chính mốc này. */
  toDate?: string
}
