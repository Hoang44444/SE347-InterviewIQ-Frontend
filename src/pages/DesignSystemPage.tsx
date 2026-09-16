import { useState, type ReactNode } from 'react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Stack,
  Textarea,
} from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'

/**
 * Trang tra cứu design system.
 *
 * Trước khi tự viết một component mới, hãy mở /design-system xem
 * đã có sẵn thứ cần dùng chưa. Đây là cách để năm luồng nghiệp vụ
 * không đẻ ra năm bộ giao diện khác nhau.
 */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-content">{title}</h2>
        {description && <p className="mt-1 text-sm text-content-muted">{description}</p>}
      </div>
      <Card>{children}</Card>
    </section>
  )
}

function Swatch({ className, name }: { className: string; name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-12 rounded-control border border-border ${className}`} />
      <code className="text-xs text-content-subtle">{name}</code>
    </div>
  )
}

// Phải viết nguyên tên class, không ghép chuỗi động, vì Tailwind quét tĩnh mã nguồn.
const BRAND_SWATCHES = [
  { className: 'bg-brand-50', name: 'brand-50' },
  { className: 'bg-brand-100', name: 'brand-100' },
  { className: 'bg-brand-200', name: 'brand-200' },
  { className: 'bg-brand-300', name: 'brand-300' },
  { className: 'bg-brand-400', name: 'brand-400' },
  { className: 'bg-brand-500', name: 'brand-500' },
  { className: 'bg-brand-600', name: 'brand-600' },
  { className: 'bg-brand-700', name: 'brand-700' },
  { className: 'bg-brand-800', name: 'brand-800' },
  { className: 'bg-brand-900', name: 'brand-900' },
  { className: 'bg-brand-950', name: 'brand-950' },
]

const SEMANTIC_SWATCHES = [
  { className: 'bg-surface', name: 'surface' },
  { className: 'bg-surface-muted', name: 'surface-muted' },
  { className: 'bg-surface-sunken', name: 'surface-sunken' },
  { className: 'bg-border', name: 'border' },
  { className: 'bg-border-strong', name: 'border-strong' },
  { className: 'bg-content', name: 'content' },
  { className: 'bg-content-muted', name: 'content-muted' },
  { className: 'bg-content-subtle', name: 'content-subtle' },
]

const STATUS_SWATCHES = [
  { className: 'bg-success-600', name: 'success-600' },
  { className: 'bg-warning-600', name: 'warning-600' },
  { className: 'bg-danger-600', name: 'danger-600' },
  { className: 'bg-info-600', name: 'info-600' },
]

const TEXT_SCALE = [
  { className: 'text-xs', name: 'text-xs' },
  { className: 'text-sm', name: 'text-sm' },
  { className: 'text-base', name: 'text-base' },
  { className: 'text-lg', name: 'text-lg' },
  { className: 'text-xl', name: 'text-xl' },
  { className: 'text-2xl', name: 'text-2xl' },
  { className: 'text-3xl', name: 'text-3xl' },
]

/*
 * Danh sách này chỉ ghi TÊN token. Độ dài của thanh màu bên dưới
 * đọc thẳng biến CSS ra, nên nếu ai sửa tokens.css mà quên sửa đây
 * thì thanh màu vẫn nhảy theo — bảng này không thể nói dối.
 */
const SPACING_SCALE = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']

const SELECT_OPTIONS = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'coding', label: 'Coding' },
]

export function DesignSystemPage() {
  useDocumentTitle('Design system')
  const toast = useToast()

  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <Stack gap="xl">
      <PageHeader
        title="Design system"
        description="Bảng tra cứu màu, chữ, khoảng cách và component dùng chung. Luôn ưu tiên dùng lại thay vì tự viết mới."
      />

      <Section
        title="Màu thương hiệu"
        description="Thang màu chính. Hành động chính dùng brand-600, hover sang brand-700."
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {BRAND_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </Section>

      <Section
        title="Màu ngữ nghĩa"
        description="Ưu tiên nhóm này thay vì gọi thẳng bảng màu mặc định. Đổi dark mode sau này chỉ cần sửa token."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SEMANTIC_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </Section>

      <Section title="Màu trạng thái" description="Dùng đúng ngữ nghĩa, không dùng vì thấy đẹp.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUS_SWATCHES.map((swatch) => (
            <Swatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </Section>

      <Section
        title="Kiểu chữ"
        description="Font Be Vietnam Pro, tự host trong dự án nên không phụ thuộc mạng."
      >
        <Stack gap="sm">
          {TEXT_SCALE.map((item) => (
            <div key={item.name} className="flex items-baseline gap-4">
              <code className="w-20 shrink-0 text-xs text-content-subtle">{item.name}</code>
              <span className={item.className}>Luyện phỏng vấn cùng InterviewIQ</span>
            </div>
          ))}
        </Stack>
      </Section>

      <Section
        title="Khoảng cách"
        description="Thang chính thức, mọi bước là bội số của 4px. Gọi bằng tên chứ đừng gõ số; ESLint chặn các bước nằm ngoài nhịp này."
      >
        <Stack gap="sm">
          {SPACING_SCALE.map((token) => (
            <div key={token} className="flex items-center gap-4">
              <code className="w-28 shrink-0 text-xs text-content-subtle">{`--space-${token}`}</code>
              <div
                className="h-4 rounded bg-brand-500"
                style={{ width: `var(--space-${token})` }}
              />
            </div>
          ))}
        </Stack>
      </Section>

      <Section title="Bo góc và độ đổ bóng">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-control border border-border bg-surface p-4 text-sm shadow-card">
            rounded-control + shadow-card
          </div>
          <div className="rounded-card border border-border bg-surface p-4 text-sm shadow-popover">
            rounded-card + shadow-popover
          </div>
          <div className="rounded-panel border border-border bg-surface p-4 text-sm shadow-modal">
            rounded-panel + shadow-modal
          </div>
        </div>
      </Section>

      <Section title="Button" description="Mỗi màn hình chỉ nên có một nút primary.">
        <Stack gap="lg">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button isLoading>Đang xử lý</Button>
            <Button disabled>Đã khoá</Button>
            <Button
              leftIcon={
                <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
                  <path
                    d="M10 4v12M4 10h12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Có icon
            </Button>
          </div>
        </Stack>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="success">Hoàn thành</Badge>
          <Badge tone="warning">Cảnh báo</Badge>
          <Badge tone="danger">Đã huỷ</Badge>
          <Badge tone="info">Đang diễn ra</Badge>
        </div>
      </Section>

      <Section
        title="Ô nhập liệu"
        description="Input, Textarea, Select dùng chung khung Field nên nhãn, mô tả và lỗi luôn đồng nhất."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Bình thường" placeholder="Nhập gì đó" />
          <Input
            label="Có mô tả"
            hint="Mô tả ngắn giúp người dùng điền đúng"
            placeholder="ban@example.com"
          />
          <Input label="Bắt buộc" required placeholder="Không được bỏ trống" />
          <Input label="Có lỗi" error="Email không hợp lệ" defaultValue="sai-dinh-dang" />
          <Input label="Bị khoá" disabled defaultValue="Không sửa được" />
          <Select
            label="Select"
            options={SELECT_OPTIONS}
            placeholder="Chọn loại câu hỏi"
            defaultValue=""
          />
          <Textarea label="Textarea" placeholder="Câu trả lời của bạn" className="sm:col-span-2" />
        </div>
      </Section>

      <Section title="Spinner">
        <div className="flex items-center gap-6">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </Section>

      <Section
        title="EmptyState"
        description="Dùng khi danh sách rỗng, đừng để màn hình trắng trơn."
      >
        <EmptyState
          title="Chưa có dữ liệu"
          description="Khi danh sách rỗng thì hiện khối này kèm một hành động rõ ràng."
          action={<Button size="sm">Tạo mục đầu tiên</Button>}
        />
      </Section>

      <Section
        title="Modal"
        description="Dùng thẻ dialog của trình duyệt: tự bẫy focus, đóng bằng Escape, không lo z-index."
      >
        <Button onClick={() => setIsModalOpen(true)}>Mở modal thử</Button>
      </Section>

      <Section
        title="Toast"
        description="Gọi qua hook useToast() từ bất kỳ đâu. Toast nằm ở top layer nên hiện được cả khi modal đang mở."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success('Lưu thành công')}>
            Success
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast.error('Lỗi kết nối', 'Không gọi được API')}
          >
            Error
          </Button>
          <Button variant="secondary" onClick={() => toast.warning('Sắp hết thời gian')}>
            Warning
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Có bản cập nhật mới')}>
            Info
          </Button>
        </div>
      </Section>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modal mẫu"
        description="Thử nhấn Escape hoặc bấm ra vùng nền để đóng."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Huy
            </Button>
            <Button
              onClick={() => {
                toast.success('Toast bắn ra từ trong modal')
              }}
            >
              Ban toast thu
            </Button>
          </>
        }
      >
        <Stack gap="md">
          <p className="text-sm text-content-muted">
            Bam nut ban toast de kiem chung toast van hien de len tren nen mo cua modal.
          </p>
          <Input label="Ô nhập trong modal" placeholder="Focus bị giữ lại trong modal này" />
        </Stack>
      </Modal>
    </Stack>
  )
}
