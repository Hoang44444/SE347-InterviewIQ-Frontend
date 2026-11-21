import type { AxiosRequestConfig } from 'axios'
import { afterEach, expect, test, vi } from 'vitest'

import { apiClient } from './apiClient'
import { cvService } from './cvService'

import { CV_BUSY_MESSAGE, CV_LIMIT_MESSAGE } from '@/constants/cv'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.restoreAllMocks()
})

const pdf = new File(['%PDF'], 'moi.pdf', { type: 'application/pdf' })
const cvId = '00000000-0000-4000-8000-000000000001'

/** Giả backend: ghi lại request cuối và trả về status/body đã chọn. */
function mockBackend(status: number, body: unknown = {}) {
  const requests: AxiosRequestConfig[] = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    const response = { data: body, status, statusText: '', headers: {}, config }
    if (status >= 400) throw Object.assign(new Error('failed'), { isAxiosError: true, response })
    return response
  }
  return requests
}

function mockStorageUpload() {
  vi.spyOn(cvService, 'getSignedParams').mockResolvedValue({
    uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload',
    apiKey: 'key',
    timestamp: 1,
    signature: 'sig',
    cloudinaryPublicId: 'cvs/u/f',
    allowedFormats: 'pdf',
    assetFolder: 'InterviewIQ/cvs/u',
  })
  vi.spyOn(cvService, 'uploadToCloudinary').mockResolvedValue()
}

function errorBody(code: string, message: string) {
  return { statusCode: 0, success: false, code, message, path: '', timestamp: '' }
}

test('remove sends DELETE for that CV', async () => {
  const requests = mockBackend(200, { data: null })

  await cvService.remove(cvId)

  expect(requests[0].method).toBe('delete')
  expect(requests[0].url).toBe(`/cvs/${cvId}`)
})

test('remove explains a 409 (CV is being parsed) in Vietnamese', async () => {
  mockBackend(409, errorBody('CONFLICT', 'This CV is being parsed, try again'))

  await expect(cvService.remove(cvId)).rejects.toMatchObject({
    status: 409,
    message: CV_BUSY_MESSAGE,
  })
})

test('remove leaves a 404 untouched so the page can drop the CV', async () => {
  mockBackend(404, errorBody('NOT_FOUND', 'CV not found'))

  await expect(cvService.remove(cvId)).rejects.toMatchObject({
    status: 404,
    message: 'CV not found',
  })
})

test('replace uploads the file, then sends PUT /cvs/:id/file with the name and storage id', async () => {
  mockStorageUpload()
  const requests = mockBackend(200, { data: { publicId: cvId } })

  const cv = await cvService.replace(cvId, pdf)

  expect(cv.publicId).toBe(cvId)
  expect(requests[0].method).toBe('put')
  expect(requests[0].url).toBe(`/cvs/${cvId}/file`)
  expect(JSON.parse(requests[0].data as string)).toEqual({
    fileName: 'moi.pdf',
    cloudinaryPublicId: 'cvs/u/f',
  })
})

test('replace explains a 409 in Vietnamese', async () => {
  mockStorageUpload()
  mockBackend(409, errorBody('CONFLICT', 'This CV is being parsed, try again'))

  await expect(cvService.replace(cvId, pdf)).rejects.toMatchObject({ message: CV_BUSY_MESSAGE })
})

test('replace rejects a non-PDF before it asks for any signature', async () => {
  const signed = vi.spyOn(cvService, 'getSignedParams')

  await expect(
    cvService.replace(cvId, new File(['x'], 'a.png', { type: 'image/png' })),
  ).rejects.toMatchObject({ message: 'Chỉ nhận file PDF' })
  expect(signed).not.toHaveBeenCalled()
})

test('upload explains a 429 (CV limit reached) in Vietnamese', async () => {
  mockStorageUpload()
  mockBackend(429, errorBody('TOO_MANY_REQUESTS', 'You can keep at most 10 CVs.'))

  await expect(cvService.upload(pdf)).rejects.toMatchObject({
    status: 429,
    message: CV_LIMIT_MESSAGE,
  })
})

test('upload keeps the backend message for a duplicate file (409)', async () => {
  mockStorageUpload()
  mockBackend(409, errorBody('CONFLICT', 'This file has already been saved'))

  await expect(cvService.upload(pdf)).rejects.toMatchObject({
    message: 'This file has already been saved',
  })
})
