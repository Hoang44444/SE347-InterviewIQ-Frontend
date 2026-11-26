import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, expect, test } from 'vitest'

import { apiClient } from './apiClient'
import { EMPTY_BANK_FILTER, hasActiveBankFilter, questionBankService } from './questionBankService'

import { STORAGE_KEYS } from '@/constants'
import { BANK_PAGE_SIZE } from '@/constants/questionBank'
import { bankPage } from '@/test/questionBankFixtures'
import { generatedQuestions } from '@/test/sessionFixtures'
import { storage } from '@/utils/storage'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

function recordRequests(data: unknown, status = 200) {
  const requests: InternalAxiosRequestConfig[] = []
  storage.set(STORAGE_KEYS.accessToken, 'test-token')
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    return { data: { success: true, data }, status, statusText: 'OK', headers: {}, config }
  }
  return requests
}

test('list sends only pagination when no filter is set, with the bearer token', async () => {
  const page = bankPage()
  const requests = recordRequests(page)

  expect(await questionBankService.list()).toEqual(page)

  expect(requests[0].method).toBe('get')
  expect(requests[0].url).toBe('/question-bank')
  expect(requests[0].params).toEqual({ pageNumber: 1, pageSize: BANK_PAGE_SIZE })
  expect(requests[0].headers.Authorization).toBe('Bearer test-token')
})

test('list never sends empty filter values, which the backend rejects with 400', async () => {
  const requests = recordRequests(bankPage())

  await questionBankService.list(1, { domain: '', difficulty: '', search: '   ' })
  await questionBankService.list(3, {
    domain: 'TECHNICAL',
    difficulty: 'HARD',
    search: '  thread  ',
  })

  expect(requests[0].params).toEqual({ pageNumber: 1, pageSize: BANK_PAGE_SIZE })
  expect(requests[1].params).toEqual({
    pageNumber: 3,
    pageSize: BANK_PAGE_SIZE,
    domain: 'TECHNICAL',
    difficulty: 'HARD',
    search: 'thread',
  })
})

test('hasActiveBankFilter ignores a blank search', () => {
  expect(hasActiveBankFilter(EMPTY_BANK_FILTER)).toBe(false)
  expect(hasActiveBankFilter({ ...EMPTY_BANK_FILTER, search: '  ' })).toBe(false)
  expect(hasActiveBankFilter({ ...EMPTY_BANK_FILTER, search: 'a' })).toBe(true)
  expect(hasActiveBankFilter({ ...EMPTY_BANK_FILTER, domain: 'BEHAVIORAL' })).toBe(true)
})

test('saveFromSession posts the payload as given and omits question ids to save the whole set', async () => {
  const requests = recordRequests({ savedCount: 3, skippedCount: 1 }, 201)
  const sessionPublicId = generatedQuestions.sessionPublicId

  expect(await questionBankService.saveFromSession({ sessionPublicId })).toEqual({
    savedCount: 3,
    skippedCount: 1,
  })
  await questionBankService.saveFromSession({
    sessionPublicId,
    questionPublicIds: [generatedQuestions.questions[0].publicId],
  })

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['post', '/question-bank'],
    ['post', '/question-bank'],
  ])
  expect(JSON.parse(requests[0].data)).toEqual({ sessionPublicId })
  expect(JSON.parse(requests[1].data)).toEqual({
    sessionPublicId,
    questionPublicIds: [generatedQuestions.questions[0].publicId],
  })
})

test('remove deletes by id', async () => {
  const requests = recordRequests(null)
  await questionBankService.remove('item-1')
  expect(requests[0].method).toBe('delete')
  expect(requests[0].url).toBe('/question-bank/item-1')
})

test('useInSession posts the ids in the order given', async () => {
  const requests = recordRequests(generatedQuestions)
  const id = generatedQuestions.sessionPublicId

  expect(await questionBankService.useInSession(id, ['c', 'a', 'b'])).toEqual(generatedQuestions)

  expect(requests[0].method).toBe('post')
  expect(requests[0].url).toBe(`/interview-session/${id}/questions/from-bank`)
  expect(JSON.parse(requests[0].data)).toEqual({ itemPublicIds: ['c', 'a', 'b'] })
})
