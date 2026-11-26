import { expect, test } from 'vitest'

import {
  describeBankDeleteError,
  describeBankListError,
  describeFromBankError,
  describeSaveToBankError,
} from './questionBankErrors'

const error = (status: number) => ({ status, message: 'x' })

test('a 409 means "bank full" when saving but "session started" when using bank questions', () => {
  const save = describeSaveToBankError(error(409))
  const fromBank = describeFromBankError(error(409))
  expect(save.kind).toBe('bank-full')
  expect(save.message).toMatch(/200 câu/)
  expect(save.message).toMatch(/xoá bớt/)
  expect(fromBank.kind).toBe('not-created')
  expect(fromBank.message).toMatch(/đã bắt đầu/)
  expect(save.message).not.toBe(fromBank.message)
})

test('save-to-bank maps every documented failure', () => {
  const kinds = [
    [0, 'network'],
    [400, 'invalid'],
    [404, 'not-found'],
    [409, 'bank-full'],
    [500, 'server'],
    [403, 'other'],
  ] as const
  for (const [status, kind] of kinds) {
    expect(describeSaveToBankError(error(status)).kind).toBe(kind)
  }
})

test('from-bank maps every documented failure and says the current set is unchanged on 404/500', () => {
  const kinds = [
    [0, 'network'],
    [400, 'invalid'],
    [404, 'not-found'],
    [409, 'not-created'],
    [500, 'server'],
    [403, 'other'],
  ] as const
  for (const [status, kind] of kinds) {
    expect(describeFromBankError(error(status)).kind).toBe(kind)
  }
  expect(describeFromBankError(error(404)).message).toMatch(/không đổi/)
  expect(describeFromBankError(error(500)).message).toMatch(/không đổi/)
})

test('list and delete map their failures', () => {
  expect(describeBankListError(error(400)).kind).toBe('invalid')
  expect(describeBankListError(error(500)).kind).toBe('server')
  expect(describeBankListError(error(0)).kind).toBe('network')
  expect(describeBankListError(error(403)).kind).toBe('other')
  expect(describeBankDeleteError(error(400)).kind).toBe('invalid')
  expect(describeBankDeleteError(error(500)).kind).toBe('server')
  expect(describeBankDeleteError(error(0)).kind).toBe('network')
  expect(describeBankDeleteError(error(403)).kind).toBe('other')
})
