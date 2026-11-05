/** Ngôn ngữ nhận dạng giọng nói mặc định. */
export const SPEECH_LANG_DEFAULT = 'vi-VN'

/** Ngưỡng tốc độ nói (từ/phút) cho tiếng Việt: dưới là chậm, trên là nhanh. */
export const SPEECH_WPM_SLOW = 90
export const SPEECH_WPM_FAST = 180

/** Cửa sổ trượt (giây) để tính tốc độ hiện tại. */
export const SPEECH_WINDOW_SECONDS = 15

/** Thời gian nghe tối thiểu (giây) trước khi báo tốc độ, tránh nhiễu lúc mới bắt đầu. */
export const SPEECH_MIN_WINDOW_SECONDS = 8

/** Giới hạn ký tự của transcript, khớp giới hạn của backend khi nộp câu trả lời. */
export const TRANSCRIPT_MAX_LENGTH = 50_000

/**
 * Số lần nhận dạng kết thúc ngay sau khi vừa bắt đầu (dưới SPEECH_RESTART_GRACE_MS)
 * được chấp nhận trước khi ngừng tự khởi động lại.
 */
export const SPEECH_MAX_RAPID_RESTARTS = 3
export const SPEECH_RESTART_GRACE_MS = 1_000

/** Chu kỳ làm mới tốc độ nói khi đang nghe (ms). */
export const SPEECH_TICK_MS = 1_000
