import type { ReactNode } from 'react'

const ROLES = ['Frontend', 'Backend', 'Data']

/* Bước 1: chip vị trí, rê chuột thì vị trí đầu tiên được chọn. */
function RoleChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {ROLES.map((role, index) => (
        <span
          key={role}
          className={
            index === 0
              ? 'rounded-full border border-border-strong px-3 py-1 text-sm text-content-muted transition-colors duration-300 group-hover:border-brand-600 group-hover:bg-brand-600 group-hover:text-white'
              : 'rounded-full border border-border-strong px-3 py-1 text-sm text-content-muted transition-opacity duration-300 group-hover:opacity-40'
          }
        >
          {role}
        </span>
      ))}
    </div>
  )
}

/* Bước 2: thanh điểm, rê chuột thì chạy lại từ 0. */
function ScoreBar() {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-content-muted">Câu trả lời 3</span>
        <span className="font-semibold text-success-700 tabular-nums">8,2</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-surface-sunken">
        <div className="h-full w-[82%] origin-left rounded-full bg-success-600 group-hover:animate-grow-x" />
      </div>
    </div>
  )
}

/* Bước 3: đường điểm qua các buổi, rê chuột thì tự vẽ lại. */
function ProgressLine() {
  return (
    // viewBox giữ đúng tỉ lệ khung để pathLength tính đúng, nét không bị đứt khi vẽ.
    <svg viewBox="0 0 300 48" className="h-10 w-full overflow-visible">
      <path
        d="M4 42 L52 36 L100 39 L148 26 L196 29 L244 14 L292 6"
        pathLength={1}
        className="fill-none stroke-brand-500 [stroke-dasharray:1] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5] group-hover:animate-draw"
      />
      <circle cx="292" cy="6" r="4" className="fill-brand-500" />
    </svg>
  )
}

const STEPS: { title: string; desc: string; visual: ReactNode }[] = [
  {
    title: 'Chọn vị trí ứng tuyển',
    desc: 'Câu hỏi behavioral, technical và coding được chọn theo đúng vị trí bạn nhắm tới.',
    visual: <RoleChips />,
  },
  {
    title: 'Trả lời và nhận điểm',
    desc: 'Mỗi câu trả lời được chấm điểm kèm nhận xét chi tiết sau buổi phỏng vấn.',
    visual: <ScoreBar />,
  },
  {
    title: 'Theo dõi tiến bộ',
    desc: 'Lịch sử và đồ thị điểm cho thấy bạn tiến bộ thế nào qua từng buổi.',
    visual: <ProgressLine />,
  },
]

/** Ba bước của một buổi luyện tập. Mỗi bước rê chuột vào sẽ minh hoạ đúng việc nó làm. */
export function SessionSteps() {
  return (
    <section aria-labelledby="session-steps-title">
      <h2 id="session-steps-title" className="text-xl font-bold tracking-tight text-content">
        Một buổi luyện tập gồm ba bước
      </h2>

      <ol className="mt-4 grid divide-y divide-border overflow-hidden rounded-panel border border-border bg-surface shadow-card md:grid-cols-3 md:divide-x md:divide-y-0">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="group relative flex flex-col px-(--space-lg) py-(--space-md) transition-colors duration-300 hover:bg-surface-muted"
          >
            {/* Vạch tiến trình chạy ngang mép trên khi rê chuột. */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brand-500 transition-transform duration-500 ease-out-soft group-hover:scale-x-100"
            />
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border-strong text-sm font-semibold text-content-muted transition-colors duration-300 group-hover:border-brand-600 group-hover:bg-brand-600 group-hover:text-white">
                {index + 1}
              </span>
              <h3 className="font-semibold text-content">{step.title}</h3>
            </div>
            <p className="mt-2 text-sm text-content-muted">{step.desc}</p>
            <div className="mt-auto pt-4">{step.visual}</div>
          </li>
        ))}
      </ol>
    </section>
  )
}
