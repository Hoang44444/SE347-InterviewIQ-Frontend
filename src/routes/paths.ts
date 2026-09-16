/** Khai báo đường dẫn ở một nơi để không gõ nhầm chuỗi trong Link. */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  interviews: '/interviews',
  interviewRoom: (id: string) => `/interviews/${id}`,
  profile: '/profile',
  designSystem: '/design-system',
} as const
