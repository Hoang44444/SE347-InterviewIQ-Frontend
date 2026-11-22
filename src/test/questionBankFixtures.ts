import type { PageResult } from '@/types/api'
import type { BankItem } from '@/types/questionBank'

export const bankItems: BankItem[] = [
  {
    id: '00000000-0000-4000-8000-0000000000b1',
    content: 'Phân biệt tiến trình và luồng trong hệ điều hành.',
    domain: 'TECHNICAL',
    difficulty: 'MEDIUM',
    createdAt: '2026-11-22T07:58:11.000Z',
  },
  {
    id: '00000000-0000-4000-8000-0000000000b2',
    content: 'Kể về lần bạn xử lý xung đột trong nhóm.',
    domain: 'BEHAVIORAL',
    difficulty: 'EASY',
    createdAt: '2026-11-21T07:58:11.000Z',
  },
  {
    id: '00000000-0000-4000-8000-0000000000b3',
    content: 'Hệ thống chậm vào giờ cao điểm, bạn sẽ làm gì đầu tiên?',
    domain: 'SITUATIONAL',
    difficulty: 'HARD',
    createdAt: '2026-11-20T07:58:11.000Z',
  },
  {
    id: '00000000-0000-4000-8000-0000000000b4',
    content: 'Giải thích index trong cơ sở dữ liệu quan hệ.',
    domain: 'TECHNICAL',
    difficulty: 'EASY',
    createdAt: '2026-11-19T07:58:11.000Z',
  },
]

export function bankPage(
  items: BankItem[] = bankItems,
  pageNumber = 1,
  totalPages = 1,
): PageResult<BankItem> {
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
