import { describe, expect, it } from 'vitest'
import {
  createSnapshotFxResolver,
  createStaticFxResolver,
  identityFxResolver,
  invertRate,
} from './exchange-rate'
import { convertWithResolver } from './convert'
import { fromMajor } from '../money/money'

describe('fx resolvers', () => {
  it('returns identity for same currency and null otherwise', () => {
    expect(identityFxResolver.getRate('EUR', 'EUR')).toBe(1)
    expect(identityFxResolver.getRate('EUR', 'USD')).toBeNull()
  })

  it('resolves direct and inverse static rates', () => {
    const fx = createStaticFxResolver({ 'USD:EUR': 0.9 })
    expect(fx.getRate('USD', 'EUR')).toBeCloseTo(0.9)
    expect(fx.getRate('EUR', 'USD')).toBeCloseTo(1 / 0.9)
  })

  it('resolves from a pre-fetched snapshot map', () => {
    const fx = createSnapshotFxResolver(new Map([['GBP:USD', 1.25]]))
    expect(fx.getRate('GBP', 'USD')).toBeCloseTo(1.25)
    expect(fx.getRate('GBP', 'JPY')).toBeNull()
  })

  it('inverts rates safely', () => {
    expect(invertRate(2)).toBe(0.5)
    expect(() => invertRate(0)).toThrow()
  })
})

describe('convert with resolver', () => {
  it('converts when a rate exists', () => {
    const fx = createStaticFxResolver({ 'USD:EUR': 0.9 })
    const result = convertWithResolver(fromMajor(100, 'USD'), 'EUR', fx)
    expect(result.ok).toBe(true)
    expect(result.value.minorUnits).toBe(9000)
  })

  it('returns a zero placeholder and ok=false when the rate is missing', () => {
    const result = convertWithResolver(fromMajor(100, 'USD'), 'EUR', identityFxResolver)
    expect(result.ok).toBe(false)
    expect(result.value.minorUnits).toBe(0)
    expect(result.value.currency).toBe('EUR')
  })
})
