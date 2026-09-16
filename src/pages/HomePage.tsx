import { Link } from 'react-router-dom'

import { Card, Stack } from '@/components/ui'
import { APP_NAME } from '@/constants'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ROUTES } from '@/routes/paths'

const FEATURES = [
  { title: 'Ngân hàng câu hỏi', desc: 'Câu hỏi behavioral, technical và coding theo từng vị trí.' },
  {
    title: 'Chấm điểm tự động',
    desc: 'Nhận xét chi tiết cho từng câu trả lời sau buổi phỏng vấn.',
  },
  { title: 'Theo dõi tiến độ', desc: 'Xem lịch sử và đồ thị tiến bộ qua từng buổi luyện tập.' },
]

export function HomePage() {
  useDocumentTitle('Trang chủ')

  return (
    <Stack gap="xl">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-bold text-content sm:text-5xl">
          Luyện phỏng vấn cùng <span className="text-brand-600">{APP_NAME}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-content-muted">
          Mô phỏng buổi phỏng vấn thật, nhận phản hồi tức thì và cải thiện qua từng lần luyện tập.
        </p>
        <Link
          to={ROUTES.register}
          className="mt-8 inline-block rounded-control bg-brand-600 px-6 py-3 font-medium text-white transition hover:bg-brand-700"
        >
          Bắt đầu miễn phí
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <h2 className="font-semibold text-content">{feature.title}</h2>
            <p className="mt-2 text-sm text-content-muted">{feature.desc}</p>
          </Card>
        ))}
      </section>
    </Stack>
  )
}
