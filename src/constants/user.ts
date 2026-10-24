/*
 * Chép từ backend (modules/user: avatar.constant.ts và UpdateUserProfileRequestDto).
 * FE chỉ dùng để báo lỗi sớm, backend vẫn kiểm tra lại bằng dung lượng và
 * content-type thật. Backend đổi luật thì sửa ở đây.
 */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export const ALLOWED_AVATAR_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

/** Lọc sẵn trong hộp thoại chọn file, người dùng không thấy file không chọn được. */
export const AVATAR_ACCEPT = ALLOWED_AVATAR_MIME_TYPES.join(',')

/** Khớp VarChar(255) của cột email. */
export const EMAIL_MAX_LENGTH = 255

/**
 * Ảnh đi qua backend rồi mới lên Cloudinary nên lâu hơn một request thường,
 * không dùng REQUEST_TIMEOUT 15 giây.
 */
export const AVATAR_UPLOAD_TIMEOUT = 60_000

/**
 * Mã gắn vào lỗi do userService tự kiểm trước khi gọi API. Lỗi mạng cũng mang
 * status 0 nhưng message là tiếng Anh của axios, nên UI cần phân biệt hai loại
 * để biết message nào hiện thẳng được cho người dùng.
 */
export const CLIENT_VALIDATION_CODE = 'FE_VALIDATION'
