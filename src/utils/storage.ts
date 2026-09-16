/**
 * Bọc localStorage lại để tránh crash khi trình duyệt chặn storage
 * (chế độ riêng tư) và để tự động parse/stringify JSON.
 */
export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* hết dung lượng hoặc bị chặn: bỏ qua */
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      /* bỏ qua */
    }
  },
}
