import { apiClient } from './apiClient'

import type { ApiSuccessResponse } from '@/types/api'
import type { CvSummary } from '@/types/cv'

export const cvService = {
  async list(): Promise<CvSummary[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<CvSummary[]>>('/cvs')
    return data.data
  },
}
