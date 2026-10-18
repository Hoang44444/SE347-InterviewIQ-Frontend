import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { CvPage } from './CvPage'

import { ToastProvider } from '@/contexts/ToastProvider'
import { apiClient } from '@/services/apiClient'
import { cvService } from '@/services/cvService'
import type { Cv, CvUploadOptions } from '@/types/cv'

const parsedData = {
  summary: 'Frontend developer 2 năm kinh nghiệm.',
  skills: { languages: ['TypeScript'], frameworks: ['React'], databases: [], tools: [] },
  experiences: [
    {
      company: 'ABC Tech',
      position: 'Frontend Developer',
      startDate: '2024-07',
      endDate: null,
      description: null,
      technologies: [],
    },
  ],
  education: [],
  projects: [],
}

function makeCv(overrides: Partial<Cv> = {}): Cv {
  return {
    publicId: '00000000-0000-4000-8000-000000000001',
    fileName: 'cv-chinh.pdf',
    fileSize: 412_000,
    parseStatus: 'COMPLETED',
    isActive: true,
    createdAt: '2026-09-20T08:00:00.000Z',
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/cvs/u/f.pdf',
    parsedData,
    updatedAt: '2026-09-20T08:00:00.000Z',
    ...overrides,
  }
}

const original = makeCv()
const failed = makeCv({
  publicId: '00000000-0000-4000-8000-000000000002',
  fileName: 'cv-scan.pdf',
  parseStatus: 'FAILED',
  isActive: false,
  parsedData: null,
})

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.restoreAllMocks()
})

/** Giả backend: GET /cvs trả danh sách, GET /cvs/:id trả chi tiết. */
function mockApi(cvs: Cv[]) {
  apiClient.defaults.adapter = async (config) => {
    const id = config.url?.replace('/cvs/', '')
    const data = config.url === '/cvs' ? cvs : cvs.find((cv) => cv.publicId === id)
    return {
      data: { statusCode: 200, success: true, data, message: 'OK', timestamp: '' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
}

function renderPage() {
  return render(
    <ToastProvider>
      <CvPage />
    </ToastProvider>,
  )
}

function chooseFile(container: HTMLElement, file: File) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
  fireEvent.change(input, { target: { files: [file] } })
}

const pdf = new File(['%PDF'], 'moi.pdf', { type: 'application/pdf' })

test('lists the CVs and opens the active one with its parsed data', async () => {
  mockApi([original, failed])
  renderPage()

  expect(await screen.findByRole('heading', { name: 'cv-chinh.pdf' })).toBeInTheDocument()
  expect(screen.getByText('CV chính')).toBeInTheDocument()
  expect(screen.getByText('Frontend developer 2 năm kinh nghiệm.')).toBeInTheDocument()
  expect(screen.getByText('07/2024 – Hiện tại')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Xem file' })).toHaveAttribute('href', original.fileUrl)
})

test('selecting a failed CV shows the failure message', async () => {
  mockApi([original, failed])
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: /cv-scan\.pdf/ }))

  expect(await screen.findByRole('heading', { name: 'cv-scan.pdf' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Không đọc được nội dung CV')
})

test('shows the empty state when the user has no CV yet', async () => {
  mockApi([])
  renderPage()

  expect(await screen.findByText('Bạn chưa có CV nào')).toBeInTheDocument()
})

test('rejects a non-PDF file with a message and never reaches the network', async () => {
  mockApi([])
  const signedParams = vi.spyOn(cvService, 'getSignedParams')
  const { container } = renderPage()
  await screen.findByText('Bạn chưa có CV nào')

  chooseFile(container, new File(['x'], 'anh.png', { type: 'image/png' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ nhận file PDF')
  expect(signedParams).not.toHaveBeenCalled()
})

test('a successful upload puts the new CV first and selects it', async () => {
  mockApi([original])
  const uploaded = makeCv({
    publicId: '00000000-0000-4000-8000-000000000009',
    fileName: 'moi.pdf',
    parseStatus: 'PENDING',
    isActive: false,
    parsedData: null,
  })
  vi.spyOn(cvService, 'upload').mockResolvedValue(uploaded)
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  chooseFile(container, pdf)

  expect(await screen.findByRole('heading', { name: 'moi.pdf' })).toBeInTheDocument()
  expect(screen.getByText('CV đã được lưu')).toBeInTheDocument()
  expect(screen.getAllByRole('listitem').length).toBeGreaterThan(1)
  expect(screen.getByText('Đã tải CV lên')).toBeInTheDocument()
})

test('shows the progress and lets the user cancel without an error', async () => {
  mockApi([original])
  let report: CvUploadOptions = {}
  vi.spyOn(cvService, 'upload').mockImplementation(
    (_file, options = {}) =>
      new Promise((_resolve, reject) => {
        report = options
        options.signal?.addEventListener('abort', () =>
          reject({ status: 0, message: 'Đã huỷ upload' }),
        )
      }),
  )
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  chooseFile(container, pdf)
  act(() => {
    report.onStage?.('uploading')
    report.onProgress?.(40)
  })

  expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
  expect(screen.getByText(/Đang tải lên 40%/)).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }))

  await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())
  expect(screen.queryByText('Đã huỷ upload')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Chọn hoặc kéo thả file CV' })).toBeInTheDocument()
})

test('shows the backend error when the upload fails', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'upload').mockRejectedValue({ status: 409, message: 'CV này đã được lưu' })
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  chooseFile(container, pdf)

  expect(await screen.findByRole('alert')).toHaveTextContent('CV này đã được lưu')
})
