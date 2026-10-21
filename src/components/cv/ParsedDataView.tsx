import type { CvParsedData } from '@/types/cv'
import { formatYearMonth } from '@/utils/format'

const SKILL_GROUPS: { key: keyof CvParsedData['skills']; label: string }[] = [
  { key: 'languages', label: 'Ngôn ngữ' },
  { key: 'frameworks', label: 'Framework' },
  { key: 'databases', label: 'CSDL' },
  { key: 'tools', label: 'Công cụ' },
]

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-semibold tracking-wide text-content-subtle uppercase">
      {children}
    </h3>
  )
}

/** Hiện nội dung AI đọc được từ CV. Danh sách rỗng thì ẩn cả mục, không hiện tiêu đề trơ. */
export function ParsedDataView({ data }: { data: CvParsedData }) {
  const skillGroups = SKILL_GROUPS.filter((group) => data.skills[group.key].length > 0)

  return (
    <div className="flex flex-col gap-6">
      {data.summary && (
        <section className="flex flex-col gap-2">
          <SectionTitle>Tóm tắt</SectionTitle>
          <p className="text-sm leading-relaxed text-content-muted">{data.summary}</p>
        </section>
      )}

      {skillGroups.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Kỹ năng</SectionTitle>
          {skillGroups.map((group) => (
            <div
              key={group.key}
              className="grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-3"
            >
              <span className="text-sm text-content-muted">{group.label}</span>
              <ul className="flex flex-wrap gap-1.5">
                {data.skills[group.key].map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-content-muted"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {data.experiences.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Kinh nghiệm</SectionTitle>
          {data.experiences.map((item, index) => (
            <div
              key={`${item.company}-${index}`}
              className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-sm font-semibold text-content">
                  {item.position} &middot; {item.company}
                </p>
                <p className="text-xs text-content-subtle">
                  {formatYearMonth(item.startDate)} &ndash; {formatYearMonth(item.endDate)}
                </p>
              </div>
              {item.description && <p className="text-sm text-content-muted">{item.description}</p>}
              {item.technologies.length > 0 && (
                <p className="text-xs text-content-subtle">{item.technologies.join(' · ')}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {(data.education.length > 0 || data.projects.length > 0) && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-6">
          {data.education.length > 0 && (
            <section className="flex flex-col gap-2">
              <SectionTitle>Học vấn</SectionTitle>
              {data.education.map((item, index) => (
                <div key={`${item.institution}-${index}`}>
                  <p className="text-sm font-semibold text-content">{item.institution}</p>
                  <p className="mt-0.5 text-sm text-content-muted">
                    {[item.degree, item.graduationYear].filter(Boolean).join(' · ')}
                  </p>
                </div>
              ))}
            </section>
          )}
          {data.projects.length > 0 && (
            <section className="flex flex-col gap-2">
              <SectionTitle>Dự án</SectionTitle>
              {data.projects.map((item, index) => (
                <div key={`${item.name}-${index}`}>
                  <p className="text-sm font-semibold text-content">{item.name}</p>
                  <p className="mt-0.5 text-sm text-content-muted">
                    {[item.role, item.description].filter(Boolean).join(' — ')}
                  </p>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
