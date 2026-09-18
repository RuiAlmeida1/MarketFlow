import { describe, expect, it } from 'vitest'
import { timingSafeEqual, verifyCredentials } from './password'

describe('timingSafeEqual', () => {
  it('matches equal strings', () => {
    expect(timingSafeEqual('secret', 'secret')).toBe(true)
  })

  it('rejects different strings of equal and unequal length', () => {
    expect(timingSafeEqual('secret', 'secreT')).toBe(false)
    expect(timingSafeEqual('secret', 'secret-longer')).toBe(false)
    expect(timingSafeEqual('', 'x')).toBe(false)
  })
})

describe('verifyCredentials', () => {
  const config = { authEmail: 'User@Example.com ', authPassword: 'hunter2' }

  it('accepts a matching email (case-insensitive) and password', () => {
    expect(verifyCredentials('user@example.com', 'hunter2', config)).toBe(true)
  })

  it('rejects a wrong password or email', () => {
    expect(verifyCredentials('user@example.com', 'wrong', config)).toBe(false)
    expect(verifyCredentials('other@example.com', 'hunter2', config)).toBe(false)
  })

  it('rejects when not configured', () => {
    expect(verifyCredentials('user@example.com', 'hunter2', {})).toBe(false)
  })
})
