import { describe, expect, it } from 'vitest'
import { CurrencyMismatchError, DomainError } from '../errors'
import {
  addMoney,
  allocateMoney,
  convertMoney,
  divideMoney,
  fromMajor,
  isNegative,
  isPositive,
  isZero,
  money,
  multiplyMoney,
  multiplyMoneyByPercentage,
  roundHalfAwayFromZero,
  sameCurrency,
  subtractMoney,
  sumMoney,
  toMajor,
  zero,
} from './money'
import { formatMoney, formatPercentage } from './format'

describe('money construction', () => {
  it('constructs from major units without float drift', () => {
    expect(fromMajor(12.34, 'EUR').minorUnits).toBe(1234)
    expect(fromMajor(0.1, 'USD').minorUnits).toBe(10)
    expect(fromMajor(19.99, 'GBP').minorUnits).toBe(1999)
    expect(fromMajor(1234.56, 'EUR').minorUnits).toBe(123456)
  })

  it('honours currencies without minor units (JPY)', () => {
    expect(fromMajor(1234.4, 'JPY').minorUnits).toBe(1234)
    expect(fromMajor(1234.5, 'JPY').minorUnits).toBe(1235)
  })

  it('rejects unsupported currencies', () => {
    // @ts-expect-error - intentionally invalid currency for runtime validation
    expect(() => money(100, 'XYZ')).toThrow(DomainError)
  })

  it('rejects non-finite amounts', () => {
    expect(() => money(Number.NaN, 'EUR')).toThrow(DomainError)
    expect(() => money(Number.POSITIVE_INFINITY, 'EUR')).toThrow(DomainError)
  })

  it('derives major units for display only', () => {
    expect(toMajor(fromMajor(12.34, 'EUR'))).toBeCloseTo(12.34)
    expect(toMajor(fromMajor(1000, 'JPY'))).toBe(1000)
  })
})

describe('money arithmetic', () => {
  it('adds and subtracts within a currency', () => {
    expect(addMoney(fromMajor(10, 'EUR'), fromMajor(2.5, 'EUR')).minorUnits).toBe(1250)
    expect(subtractMoney(fromMajor(10, 'EUR'), fromMajor(2.5, 'EUR')).minorUnits).toBe(750)
  })

  it('throws on currency mismatch instead of mixing currencies', () => {
    expect(() => addMoney(fromMajor(1, 'EUR'), fromMajor(1, 'USD'))).toThrow(
      CurrencyMismatchError,
    )
    expect(() => subtractMoney(fromMajor(1, 'GBP'), fromMajor(1, 'EUR'))).toThrow(
      CurrencyMismatchError,
    )
  })

  it('multiplies by a factor and rounds half away from zero', () => {
    expect(multiplyMoney(fromMajor(100, 'USD'), 0.5).minorUnits).toBe(5000)
    expect(multiplyMoney(fromMajor(10, 'USD'), 3).minorUnits).toBe(3000)
    expect(multiplyMoney(fromMajor(0.05, 'USD'), 0.5).minorUnits).toBe(3)
  })

  it('multiplies by a percentage in points', () => {
    expect(multiplyMoneyByPercentage(fromMajor(200, 'EUR'), 3.5).minorUnits).toBe(700)
  })

  it('rejects division by zero', () => {
    expect(() => divideMoney(fromMajor(10, 'EUR'), 0)).toThrow(DomainError)
  })

  it('sums a list and returns zero for an empty list', () => {
    expect(sumMoney([], 'EUR')).toEqual(zero('EUR'))
    expect(sumMoney([fromMajor(1, 'EUR'), fromMajor(2, 'EUR')], 'EUR').minorUnits).toBe(300)
  })

  it('detects sign and same-currency', () => {
    expect(isZero(zero('USD'))).toBe(true)
    expect(isPositive(fromMajor(1, 'USD'))).toBe(true)
    expect(isNegative(fromMajor(-1, 'USD'))).toBe(true)
    expect(sameCurrency(fromMajor(1, 'USD'), fromMajor(2, 'USD'))).toBe(true)
    expect(sameCurrency(fromMajor(1, 'USD'), fromMajor(2, 'EUR'))).toBe(false)
  })

  it('rounds half away from zero symmetrically', () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3)
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3)
    expect(roundHalfAwayFromZero(1.4)).toBe(1)
    expect(roundHalfAwayFromZero(-1.4)).toBe(-1)
  })
})

describe('money allocation', () => {
  it('splits an amount without losing or inventing minor units', () => {
    const total = fromMajor(100, 'EUR')
    const parts = allocateMoney(total, [1, 1, 1])
    expect(parts.map((part) => part.minorUnits)).toEqual([3334, 3333, 3333])
    expect(sumMoney(parts, 'EUR').minorUnits).toBe(total.minorUnits)
  })

  it('distributes the remainder to the largest fractional parts', () => {
    const total = money(100, 'USD')
    const parts = allocateMoney(total, [1, 1, 2])
    expect(sumMoney(parts, 'USD').minorUnits).toBe(100)
    expect(parts).toHaveLength(3)
  })

  it('returns zeros when all weights are zero', () => {
    const parts = allocateMoney(fromMajor(50, 'EUR'), [0, 0])
    expect(parts.map((part) => part.minorUnits)).toEqual([0, 0])
  })

  it('rejects negative weights', () => {
    expect(() => allocateMoney(fromMajor(50, 'EUR'), [1, -1])).toThrow(DomainError)
  })
})

describe('currency conversion', () => {
  it('converts across equal minor-unit currencies', () => {
    const eur = fromMajor(100, 'EUR')
    expect(convertMoney(eur, 'USD', 1.1).minorUnits).toBe(11000)
  })

  it('converts across different minor units (EUR -> JPY)', () => {
    const eur = fromMajor(1, 'EUR')
    expect(convertMoney(eur, 'JPY', 160).minorUnits).toBe(160)
  })

  it('is a no-op for the same currency', () => {
    const usd = fromMajor(5, 'USD')
    expect(convertMoney(usd, 'USD', 999)).toBe(usd)
  })

  it('rejects invalid rates', () => {
    expect(() => convertMoney(fromMajor(1, 'EUR'), 'USD', 0)).toThrow(DomainError)
    expect(() => convertMoney(fromMajor(1, 'EUR'), 'USD', Number.NaN)).toThrow(DomainError)
  })
})

describe('formatting', () => {
  it('formats money with Intl', () => {
    expect(formatMoney(fromMajor(12486.32, 'EUR'), { locale: 'en-US' })).toBe('€12,486.32')
    expect(formatMoney(fromMajor(1234, 'JPY'), { locale: 'en-US' })).toBe('¥1,234')
  })

  it('formats percentages in points', () => {
    expect(formatPercentage(3.54, { locale: 'en-US' })).toBe('3.54%')
    expect(formatPercentage(-1.2, { locale: 'en-US' })).toBe('-1.20%')
  })
})
