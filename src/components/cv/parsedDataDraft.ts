import type { CvParsedData } from '@/types/cv'

export const MAX_SKILLS_PER_GROUP = 50
const MIN_GRADUATION_YEAR = 1950
const MAX_GRADUATION_YEAR = 2100

let nextKey = 0
const newKey = () => `row-${nextKey++}`

export interface ExperienceDraft {
  key: string
  company: string
  position: string
  startDate: string
  endDate: string
  description: string
  technologies: string
}

export interface EducationDraft {
  key: string
  institution: string
  degree: string
  graduationYear: string
}

export interface ProjectDraft {
  key: string
  name: string
  description: string
  role: string
}

/** Dạng chuỗi của form: danh sách kỹ năng là một ô nhập cách nhau bằng dấu phẩy. */
export interface ParsedDataDraft {
  summary: string
  languages: string
  frameworks: string
  databases: string
  tools: string
  experiences: ExperienceDraft[]
  education: EducationDraft[]
  projects: ProjectDraft[]
}

export const emptyExperience = (): ExperienceDraft => ({
  key: newKey(),
  company: '',
  position: '',
  startDate: '',
  endDate: '',
  description: '',
  technologies: '',
})

export const emptyEducation = (): EducationDraft => ({
  key: newKey(),
  institution: '',
  degree: '',
  graduationYear: '',
})

export const emptyProject = (): ProjectDraft => ({
  key: newKey(),
  name: '',
  description: '',
  role: '',
})

export function toDraft(data: CvParsedData): ParsedDataDraft {
  return {
    summary: data.summary ?? '',
    languages: data.skills.languages.join(', '),
    frameworks: data.skills.frameworks.join(', '),
    databases: data.skills.databases.join(', '),
    tools: data.skills.tools.join(', '),
    experiences: data.experiences.map((item) => ({
      key: newKey(),
      company: item.company,
      position: item.position,
      startDate: item.startDate ?? '',
      endDate: item.endDate ?? '',
      description: item.description ?? '',
      technologies: item.technologies.join(', '),
    })),
    education: data.education.map((item) => ({
      key: newKey(),
      institution: item.institution,
      degree: item.degree ?? '',
      graduationYear: item.graduationYear === null ? '' : String(item.graduationYear),
    })),
    projects: data.projects.map((item) => ({
      key: newKey(),
      name: item.name,
      description: item.description ?? '',
      role: item.role ?? '',
    })),
  }
}

export function splitList(value: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of value.split(',')) {
    const item = part.trim()
    if (item === '' || seen.has(item.toLowerCase())) continue
    seen.add(item.toLowerCase())
    result.push(item)
  }
  return result
}

const orNull = (value: string): string | null => (value.trim() === '' ? null : value.trim())

const isBlank = (...values: string[]) => values.every((value) => value.trim() === '')

/** Trả về câu báo lỗi đầu tiên để hiện cho người dùng, hoặc null nếu form hợp lệ. */
export function validateDraft(draft: ParsedDataDraft): string | null {
  const groups = [draft.languages, draft.frameworks, draft.databases, draft.tools]
  if (groups.some((group) => splitList(group).length > MAX_SKILLS_PER_GROUP)) {
    return `Mỗi nhóm kỹ năng tối đa ${MAX_SKILLS_PER_GROUP} mục`
  }

  for (const [index, item] of draft.experiences.entries()) {
    const untouched = isBlank(
      item.company,
      item.position,
      item.startDate,
      item.endDate,
      item.description,
      item.technologies,
    )
    if (!untouched && (isBlank(item.company) || isBlank(item.position))) {
      return `Kinh nghiệm #${index + 1} cần có công ty và vị trí`
    }
  }

  for (const [index, item] of draft.education.entries()) {
    if (isBlank(item.institution, item.degree, item.graduationYear)) continue
    if (isBlank(item.institution)) return `Học vấn #${index + 1} cần có tên trường`
    const year = item.graduationYear.trim()
    if (
      year !== '' &&
      !(
        /^\d{4}$/.test(year) &&
        Number(year) >= MIN_GRADUATION_YEAR &&
        Number(year) <= MAX_GRADUATION_YEAR
      )
    ) {
      return `Năm tốt nghiệp của học vấn #${index + 1} phải từ ${MIN_GRADUATION_YEAR} đến ${MAX_GRADUATION_YEAR}`
    }
  }

  for (const [index, item] of draft.projects.entries()) {
    if (!isBlank(item.name, item.description, item.role) && isBlank(item.name)) {
      return `Dự án #${index + 1} cần có tên`
    }
  }
  return null
}

/** Gọi sau khi validateDraft đã qua. Dòng bỏ trống hoàn toàn bị loại. */
export function toParsedData(draft: ParsedDataDraft): CvParsedData {
  return {
    summary: orNull(draft.summary),
    skills: {
      languages: splitList(draft.languages),
      frameworks: splitList(draft.frameworks),
      databases: splitList(draft.databases),
      tools: splitList(draft.tools),
    },
    experiences: draft.experiences
      .filter(
        (item) =>
          !isBlank(
            item.company,
            item.position,
            item.startDate,
            item.endDate,
            item.description,
            item.technologies,
          ),
      )
      .map((item) => ({
        company: item.company.trim(),
        position: item.position.trim(),
        startDate: orNull(item.startDate),
        endDate: orNull(item.endDate),
        description: orNull(item.description),
        technologies: splitList(item.technologies),
      })),
    education: draft.education
      .filter((item) => !isBlank(item.institution, item.degree, item.graduationYear))
      .map((item) => ({
        institution: item.institution.trim(),
        degree: orNull(item.degree),
        graduationYear: isBlank(item.graduationYear) ? null : Number(item.graduationYear.trim()),
      })),
    projects: draft.projects
      .filter((item) => !isBlank(item.name, item.description, item.role))
      .map((item) => ({
        name: item.name.trim(),
        description: orNull(item.description),
        role: orNull(item.role),
      })),
  }
}
