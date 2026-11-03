import { describe, expect, test } from 'vitest'

import {
  emptyEducation,
  emptyExperience,
  emptyProject,
  splitList,
  toDraft,
  toParsedData,
  validateDraft,
} from './parsedDataDraft'

import type { CvParsedData } from '@/types/cv'

const data: CvParsedData = {
  summary: 'Backend developer.',
  skills: { languages: ['TypeScript', 'Java'], frameworks: ['NestJS'], databases: [], tools: [] },
  experiences: [
    {
      company: 'ABC Tech',
      position: 'Intern',
      startDate: '2025-06',
      endDate: null,
      description: null,
      technologies: ['NestJS', 'PostgreSQL'],
    },
  ],
  education: [{ institution: 'UIT', degree: null, graduationYear: 2026 }],
  projects: [{ name: 'InterviewIQ', description: null, role: 'Backend' }],
}

describe('splitList', () => {
  test('trims, drops empty items and removes duplicates ignoring case', () => {
    expect(splitList(' React ,, react, Vue ,  ')).toEqual(['React', 'Vue'])
  })
})

describe('toDraft and toParsedData', () => {
  test('a form that was not edited gives back the same data', () => {
    expect(toParsedData(toDraft(data))).toEqual(data)
  })

  test('turns blank text into null and keeps lists as empty arrays', () => {
    const draft = toDraft(data)
    draft.summary = '   '
    draft.experiences[0].endDate = ''
    draft.education[0].graduationYear = ''

    const result = toParsedData(draft)

    expect(result.summary).toBeNull()
    expect(result.experiences[0].endDate).toBeNull()
    expect(result.education[0].graduationYear).toBeNull()
    expect(result.skills.databases).toEqual([])
  })

  test('parses the skill text boxes into lists', () => {
    const draft = toDraft(data)
    draft.tools = 'Docker, Git, docker'

    expect(toParsedData(draft).skills.tools).toEqual(['Docker', 'Git'])
  })

  test('drops rows the user added but left completely blank', () => {
    const draft = toDraft(data)
    draft.experiences.push(emptyExperience())
    draft.education.push(emptyEducation())
    draft.projects.push(emptyProject())

    const result = toParsedData(draft)

    expect(result.experiences).toHaveLength(1)
    expect(result.education).toHaveLength(1)
    expect(result.projects).toHaveLength(1)
  })

  test('gives every row its own key so removing one does not confuse React', () => {
    const keys = [emptyExperience().key, emptyExperience().key, emptyProject().key]

    expect(new Set(keys).size).toBe(3)
  })
})

describe('validateDraft', () => {
  test('accepts the data of a parsed CV', () => {
    expect(validateDraft(toDraft(data))).toBeNull()
  })

  test('accepts a blank extra row', () => {
    const draft = toDraft(data)
    draft.experiences.push(emptyExperience())

    expect(validateDraft(draft)).toBeNull()
  })

  test('asks for company and position when an experience row has other content', () => {
    const draft = toDraft(data)
    draft.experiences[0].position = ''

    expect(validateDraft(draft)).toBe('Kinh nghiệm #1 cần có công ty và vị trí')
  })

  test('asks for the school name when only a degree was typed', () => {
    const draft = toDraft(data)
    draft.education.push({ ...emptyEducation(), degree: 'Kỹ sư' })

    expect(validateDraft(draft)).toBe('Học vấn #2 cần có tên trường')
  })

  test.each(['1800', '20x4', '24', '2101'])('rejects the graduation year "%s"', (year) => {
    const draft = toDraft(data)
    draft.education[0].graduationYear = year

    expect(validateDraft(draft)).toContain('Năm tốt nghiệp')
  })

  test('asks for a project name', () => {
    const draft = toDraft(data)
    draft.projects.push({ ...emptyProject(), role: 'Lead' })

    expect(validateDraft(draft)).toBe('Dự án #2 cần có tên')
  })

  test('limits the number of skills per group', () => {
    const draft = toDraft(data)
    draft.languages = Array.from({ length: 51 }, (_, index) => `lang${index}`).join(',')

    expect(validateDraft(draft)).toContain('tối đa 50')
  })
})
