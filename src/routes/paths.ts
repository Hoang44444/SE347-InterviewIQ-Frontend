/** Khai báo đường dẫn ở một nơi để không gõ nhầm chuỗi trong Link. */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  cvs: '/cvs',
  interviews: '/interviews',
  interviewRoom: (id: string) => `/interviews/${id}`,
  devInterviewRoom: '/dev/interview-room',
  profile: '/profile',
  designSystem: '/design-system',
} as const
