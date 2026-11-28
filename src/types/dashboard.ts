/**
 * Dữ liệu cho dashboard tổng quan: thống kê điểm (GET /interviews/stats) và
 * nhận xét AI tổng hợp (GET|POST /interviews/insight).
 */

/** Bốn điểm cấp buổi, thang 0..maxScore. */
export interface InterviewStatsScores {
  contentScore: number
  relevanceScore: number
  confidenceScore: number
  overallScore: number
}

/** Một buổi đã chấm xong, dùng cho trend, buổi tốt nhất và phần so sánh. */
export interface InterviewStatsSession extends InterviewStatsScores {
  id: string
  title: string
  createdAt: string
}

export interface InterviewStatsComparison {
  latest: InterviewStatsSession
  /** null khi mới có một buổi. */
  previous: InterviewStatsSession | null
  /** latest - previous, dương là tiến bộ. null khi không có previous. */
  delta: InterviewStatsScores | null
}

/**
 * Chỉ tính các buổi COMPLETED. Buổi bị chấm 0 vì bỏ trống vẫn được tính vào
 * trung bình, vì đó là kết quả thật.
 */
export interface InterviewStats {
  maxScore: number
  completedSessions: number
  /** Câu trả lời có transcript khác rỗng trong các buổi đó. */
  answeredQuestions: number
  /** null khi chưa có buổi nào. */
  averages: InterviewStatsScores | null
  best: InterviewStatsSession | null
  /** Tối đa `limit` buổi gần nhất, cũ nhất trước. Luôn là mảng. */
  trend: InterviewStatsSession[]
  comparison: InterviewStatsComparison | null
}

export interface InsightFeedbackItem {
  category: string
  title: string
  description: string
}

export interface InsightRecommendation {
  title: string
  description: string
}

export interface HistoryInsight {
  overallFeedback: string
  strengths: InsightFeedbackItem[]
  /** Luôn có ít nhất một phần tử. */
  weaknesses: InsightFeedbackItem[]
  recommendations: InsightRecommendation[]
  /** Số buổi đã chấm lúc tạo nhận xét. */
  basedOnSessionCount: number
  generatedAt: string
}

export interface HistoryInsightState {
  /** Số buổi đã chấm hiện tại. */
  completedSessions: number
  minCompletedSessions: number
  canGenerate: boolean
  /** true khi đã có nhận xét nhưng từ đó có buổi mới chấm xong. */
  isStale: boolean
  /** null cho tới lần tạo đầu tiên. */
  insight: HistoryInsight | null
}

/** Khoảng ngày của bộ lọc dashboard, dạng "yyyy-MM-dd" như <input type="date"> trả về. */
export interface DashboardDateRange {
  fromDate: string
  toDate: string
}

/** Query của GET /interviews/stats. Hai mốc ngày là ISO 8601, không phải "yyyy-MM-dd". */
export interface InterviewStatsQuery {
  limit: number
  /** Chỉ tính buổi có createdAt >= fromDate. */
  fromDate?: string
  /** Chỉ tính buổi có createdAt <= toDate. */
  toDate?: string
}
