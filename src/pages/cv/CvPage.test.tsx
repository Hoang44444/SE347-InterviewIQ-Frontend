import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { CvPage } from './CvPage'

import { ToastProvider } from '@/contexts/ToastProvider'
import { apiClient } from '@/services/apiClient'
import { cvService } from '@/services/cvService'
import type { Cv, CvParseResult, CvUploadOptions } from '@/types/cv'

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
const parsedUploaded: CvParseResult = {
  ...makeCv({ ...uploaded, parseStatus: 'COMPLETED', parsedData }),
  failureReason: null,
}
const failedUploaded: CvParseResult = {
  ...makeCv({ ...uploaded, parseStatus: 'FAILED', parsedData: null }),
  failureReason: 'AI_FAILED',
}

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
  let finish: (cv: CvParseResult) => void = () => {}
  vi.spyOn(cvService, 'parse').mockReturnValue(
    new Promise<CvParseResult>((resolve) => (finish = resolve)),
  )
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
    .mockResolvedValue({ ...pending, parseStatus: 'COMPLETED', parsedData, failureReason: null })
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

test('a parse that fails says why: a scanned PDF asks for another file', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'upload').mockResolvedValue(uploaded)
  vi.spyOn(cvService, 'parse').mockResolvedValue({ ...failedUploaded, failureReason: 'NO_TEXT' })
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  chooseFile(container, pdf)

  expect(
    await screen.findByText(/ảnh scan\)\. Hãy thay bằng bản PDF chọn được chữ/),
  ).toBeInTheDocument()
})

test('a parse that fails because of the AI suggests trying again', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'upload').mockResolvedValue(uploaded)
  vi.spyOn(cvService, 'parse').mockResolvedValue(failedUploaded)
  const { container } = renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  chooseFile(container, pdf)

  expect(await screen.findByText(/Hãy thử phân tích lại/)).toBeInTheDocument()
})

test('deleting: asks first, then removes the CV and opens the next one', async () => {
  mockApi([original, failed])
  const remove = vi.spyOn(cvService, 'remove').mockResolvedValue()
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Xoá' }))

  const dialog = await screen.findByRole('dialog', { name: 'Xoá CV này?' })
  expect(remove).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xoá CV' }))

  await waitFor(() => expect(remove).toHaveBeenCalledWith(original.publicId))
  expect(await screen.findByText('Đã xoá CV')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'cv-scan.pdf' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /cv-chinh\.pdf/ })).not.toBeInTheDocument()
})

test('deleting: cancel keeps the CV and never calls the API', async () => {
  mockApi([original])
  const remove = vi.spyOn(cvService, 'remove').mockResolvedValue()
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Xoá' }))
  const dialog = await screen.findByRole('dialog', { name: 'Xoá CV này?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(remove).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { name: 'cv-chinh.pdf' })).toBeInTheDocument()
})

test('deleting: a failure is shown in the dialog and the CV stays', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'remove').mockRejectedValue({
    status: 500,
    message: 'Failed to delete the CV file',
  })
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Xoá' }))
  const dialog = await screen.findByRole('dialog', { name: 'Xoá CV này?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xoá CV' }))

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Failed to delete the CV file')
  expect(screen.getByRole('heading', { name: 'cv-chinh.pdf' })).toBeInTheDocument()
})

test('deleting: a CV the server no longer has just disappears (404)', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'remove').mockRejectedValue({ status: 404, message: 'CV not found' })
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Xoá' }))
  const dialog = await screen.findByRole('dialog', { name: 'Xoá CV này?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xoá CV' }))

  expect(await screen.findByText('Bạn chưa có CV nào')).toBeInTheDocument()
})

test('replacing a parsed CV: warns first, then swaps the file in place and parses it again', async () => {
  mockApi([original, failed])
  const replace = vi
    .spyOn(cvService, 'replace')
    .mockResolvedValue(makeCv({ fileName: 'cv-moi.pdf', parseStatus: 'PENDING', parsedData: null }))
  const parse = vi.spyOn(cvService, 'parse').mockResolvedValue({
    ...makeCv({ fileName: 'cv-moi.pdf' }),
    failureReason: null,
  })
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Thay file' }))
  const dialog = await screen.findByRole('dialog', { name: 'Thay file CV?' })
  expect(dialog).toHaveTextContent('Kết quả phân tích và các chỉnh sửa của bạn sẽ bị xoá')
  expect(replace).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Chọn file mới' }))
  fireEvent.change(screen.getByLabelText('Chọn file CV thay thế'), { target: { files: [pdf] } })

  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith(original.publicId, pdf, expect.anything()),
  )
  expect(await screen.findByRole('heading', { name: 'cv-moi.pdf' })).toBeInTheDocument()
  expect(await screen.findByText('Đã thay file CV')).toBeInTheDocument()
  expect(parse).toHaveBeenCalledWith(original.publicId)
  // Cùng một CV được cập nhật tại chỗ, danh sách không có thêm dòng.
  expect(screen.getAllByRole('button', { name: /\.pdf/ })).toHaveLength(2)
  expect(screen.queryByRole('button', { name: /cv-chinh\.pdf/ })).not.toBeInTheDocument()
})

test('replacing a CV that has nothing to lose opens the file picker without asking', async () => {
  mockApi([failed])
  renderPage()
  await screen.findByRole('heading', { name: 'cv-scan.pdf' })
  const pick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})

  fireEvent.click(screen.getByRole('button', { name: 'Thay file' }))

  expect(pick).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('dialog', { name: 'Thay file CV?' })).not.toBeInTheDocument()
})

test('a replace that is refused shows the backend message and keeps the CV', async () => {
  mockApi([original])
  vi.spyOn(cvService, 'replace').mockRejectedValue({
    status: 409,
    message: 'CV đang được phân tích hoặc vừa bị thay đổi. Hãy thử lại sau ít phút.',
  })
  renderPage()
  await screen.findByRole('heading', { name: 'cv-chinh.pdf' })

  fireEvent.click(screen.getByRole('button', { name: 'Thay file' }))
  const dialog = await screen.findByRole('dialog', { name: 'Thay file CV?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Chọn file mới' }))
  fireEvent.change(screen.getByLabelText('Chọn file CV thay thế'), { target: { files: [pdf] } })

  expect(await screen.findByText(/vừa bị thay đổi/)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'cv-chinh.pdf' })).toBeInTheDocument()
})
