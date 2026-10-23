import { AiInterviewer } from '@/components/home/AiInterviewer'
import { SessionSteps } from '@/components/home/SessionSteps'
import { Stack, TransitionLink } from '@/components/ui'
import { APP_NAME } from '@/constants'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ROUTES } from '@/routes/paths'

export function HomePage() {
  useDocumentTitle('Trang chủ')

  return (
    <Stack gap="xl">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
        <div>
          <h1 className="max-w-xl animate-rise-in text-4xl font-bold tracking-tight text-balance text-content stagger-2 sm:text-5xl">
            Luyện phỏng vấn cùng {APP_NAME}
          </h1>
          <p className="mt-4 max-w-xl animate-rise-in text-lg text-content-muted stagger-3">
            Mô phỏng buổi phỏng vấn thật, nhận phản hồi tức thì và cải thiện qua từng lần luyện tập.
          </p>
          {/* Animation đặt ở khung ngoài để không đè transform hover của nút. */}
          <div className="mt-6 flex animate-rise-in flex-wrap items-center gap-6 stagger-4">
            <TransitionLink
              to={ROUTES.register}
              className="rounded-control bg-brand-600 px-6 py-3 font-medium text-white transition duration-200 ease-out-soft hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-popover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:translate-y-0"
            >
              Bắt đầu miễn phí
            </TransitionLink>
            <TransitionLink
              to={ROUTES.login}
              className="font-medium text-content-muted underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-content hover:decoration-current"
            >
              Tôi đã có tài khoản
            </TransitionLink>
          </div>
        </div>

        <div className="animate-rise-in stagger-5">
          <AiInterviewer />
        </div>
      </section>

      <SessionSteps />
    </Stack>
  )
}
