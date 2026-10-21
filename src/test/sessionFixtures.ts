import type { PageResult } from '@/types/api'
import type { InterviewSession } from '@/types/interview'

export const session: InterviewSession = {
  sessionPublicId: '00000000-0000-4000-8000-000000000003',
  cvPublicId: null,
  title: 'Phỏng vấn Backend',
  status: 'CREATED',
  totalQuestion: 5,
  jobDescription: null,
  createdAt: '2026-10-13T08:00:00.000Z',
}

export const startedSession = {
  sessionPublicId: session.sessionPublicId,
  status: 'IN_PROGRESS' as const,
  startedAt: '2026-10-13T09:15:30.000Z',
}

export function sessionPage(
  items: InterviewSession[] = [session],
  pageNumber = 1,
  totalPages = 1,
): PageResult<InterviewSession> {
  return {
    items,
    totalPages,
    currentPage: pageNumber,
    pageNumber,
    pageSize: 20,
    hasPrevious: pageNumber > 1,
    hasNext: pageNumber < totalPages,
  }
}
