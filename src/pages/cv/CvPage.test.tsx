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

const uploaded = makeCv({
  publicId: '00000000-0000-4000-8000-000000000009',
  fileName: 'moi.pdf',
  parseStatus: 'PENDING',
  isActive: false,
  parsedData: null,
})
const parsedUploaded = makeCv({ ...uploaded, parseStatus: 'COMPLETED', parsedData })
const failedUploaded = makeCv({ ...uploaded, parseStatus: 'FAILED', parsedData: null })

test('a successful upload puts the new CV first, selects it and parses it', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'upload').mockResolvedValue(uploaded)
  const parse = vi.spyOn(cvService, 'parse').mockResolvedValue(parsedUploaded)
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  chooseFile(container, pdf)

  expect(await screen.findByRole('heading', { name: 'moi.pdf' })).toBeInTheDocument()
  expect(await screen.findByText('Đã phân tích CV')).toBeInTheDocument()
  expect(parse).toHaveBeenCalledWith(uploaded.publicId)
  expect(screen.getByText('Frontend developer 2 năm kinh nghiệm.')).toBeInTheDocument()
  expect(screen.getByText('Đã tải CV lên')).toBeInTheDocument()
})

test('shows "Đang phân tích" in the panel and in the list while the parse request runs', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'upload').mockResolvedValue(uploaded)
  let finish: (cv: Cv) => void = () => {}
  vi.spyOn(cvService, 'parse').mockReturnValue(new Promise<Cv>((resolve) => (finish = resolve)))
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  chooseFile(container, pdf)

  expect(await screen.findByText('Đang phân tích…')).toBeInTheDocument()
  expect(screen.getAllByText('Đang phân tích')).not.toHaveLength(0)

  await act(async () => finish(parsedUploaded))

  await waitFor(() => expect(screen.queryByText('Đang phân tích…')).not.toBeInTheDocument())
  expect(screen.getByText('Frontend developer 2 năm kinh nghiệm.')).toBeInTheDocument()
})

test('a parse that fails shows the failure and lets the user parse again', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'upload').mockResolvedValue(uploaded)
  const parse = vi
    .spyOn(cvService, 'parse')
    .mockResolvedValueOnce(failedUploaded)
    .mockResolvedValueOnce(parsedUploaded)
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })
  chooseFile(container, pdf)

  fireEvent.click(await screen.findByRole('button', { name: 'Phân tích lại' }))

  expect(await screen.findByText('Frontend developer 2 năm kinh nghiệm.')).toBeInTheDocument()
  expect(parse).toHaveBeenCalledTimes(2)
})

test('a CV that was never parsed offers "Phân tích ngay"', async () => {
  const pending = makeCv({
    publicId: '00000000-0000-4000-8000-000000000003',
    fileName: 'cv-cu.pdf',
    parseStatus: 'PENDING',
    isActive: false,
    parsedData: null,
  })
  mockApi([original, pending])
  const parse = vi
    .spyOn(cvService, 'parse')
    .mockResolvedValue({ ...pending, parseStatus: 'COMPLETED', parsedData })
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: /cv-cu\.pdf/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Phân tích ngay' }))

  await waitFor(() => expect(parse).toHaveBeenCalledWith(pending.publicId))
  expect(await screen.findByText('Đã phân tích CV')).toBeInTheDocument()
})

test('when the parse request itself fails it reports the error and asks the server for the real state', async () => {
  mockApi([original, { ...uploaded }])
  vi.spyOn(cvService, 'parse').mockRejectedValue({ status: 409, message: 'CV đang được phân tích' })
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: /moi\.pdf/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Phân tích ngay' }))

  expect(await screen.findByText('Không phân tích được CV')).toBeInTheDocument()
  expect(screen.getByText('CV đang được phân tích')).toBeInTheDocument()
})

test('editing: the user changes the summary and a skill and saves', async () => {
  mockApi([original])
  const save = vi
    .spyOn(cvService, 'updateParsedData')
    .mockImplementation(async (_id, data) => makeCv({ parsedData: data }))
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
  fireEvent.change(screen.getByLabelText('Tóm tắt'), { target: { value: '  Tóm tắt mới  ' } })
  fireEvent.change(screen.getByLabelText('Công cụ'), { target: { value: 'Docker, Git' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

  await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  const [id, payload] = save.mock.calls[0]
  expect(id).toBe(original.publicId)
  expect(payload.summary).toBe('Tóm tắt mới')
  expect(payload.skills.tools).toEqual(['Docker', 'Git'])
  expect(payload.skills.languages).toEqual(['TypeScript'])
  expect(await screen.findByText('Đã lưu chỉnh sửa')).toBeInTheDocument()
  expect(screen.getByText('Tóm tắt mới')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument()
})

test('editing: cancel leaves the data untouched and never calls the API', async () => {
  mockApi([original])
  const save = vi.spyOn(cvService, 'updateParsedData')
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
  fireEvent.change(screen.getByLabelText('Tóm tắt'), { target: { value: 'Không lưu' } })
  fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }))

  expect(screen.getByText('Frontend developer 2 năm kinh nghiệm.')).toBeInTheDocument()
  expect(save).not.toHaveBeenCalled()
})

test('editing: an experience with a company but no position is refused before any request', async () => {
  mockApi([original])
  const save = vi.spyOn(cvService, 'updateParsedData')
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
  fireEvent.change(screen.getByLabelText('Vị trí'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Kinh nghiệm #1 cần có công ty và vị trí',
  )
  expect(save).not.toHaveBeenCalled()
})

test('editing: a backend rejection is shown and the typed text is kept', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'updateParsedData').mockRejectedValue({
    status: 400,
    message: 'Request validation failed',
    errors: { 'experiences[0].startDate': ['startDate must be YYYY-MM'] },
  })
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
  fireEvent.change(screen.getByLabelText('Tóm tắt'), { target: { value: 'Giữ lại dòng này' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Request validation failed')
  expect(alert).toHaveTextContent('experiences[0].startDate: startDate must be YYYY-MM')
  expect(screen.getByLabelText('Tóm tắt')).toHaveValue('Giữ lại dòng này')
})

test('a COMPLETED CV is the only one that can be edited', async () => {
  mockApi([failed])
  renderPage()

  expect(await screen.findByRole('heading', { name: 'cv-scan.pdf' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument()
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
