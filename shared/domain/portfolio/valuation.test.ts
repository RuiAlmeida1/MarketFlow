import { describe, expect, it } from 'vitest'
import { createStaticFxResolver, identityFxResolver } from '../fx/exchange-rate'
import { fromMajor, zero } from '../money/money'
import { makePosition } from '../testing/factories'
import {
  calculateAverageCost,
  calculatePortfolioValuation,
  calculatePortfolioYield,
  calculatePositionValue,
  calculateReturnPercentage,
  calculateValueChange,
} from './valuation'

describe('position value', () => {
  it('values integer quantities', () => {
    expect(calculatePositionValue(10, fromMajor(120, 'USD')).minorUnits).toBe(120000)
  })

  it('values fractional quantities', () => {
    expect(calculatePositionValue(0.5, fromMajor(200, 'USD')).minorUnits).toBe(10000)
    expect(calculatePositionValue(0.003, fromMajor(100, 'USD')).minorUnits).toBe(30)
  })
})

describe('portfolio valuation', () => {
  it('values a single position and computes return', () => {
    const position = makePosition({
      asset: { currency: 'USD' },
      quantity: 10,
      averageCostPerShare: fromMajor(100, 'USD'),
      totalCost: fromMajor(1000, 'USD'),
      lastPrice: fromMajor(120, 'USD'),
    })
    const valuation = calculatePortfolioValuation([position], 'USD', identityFxResolver)
    expect(valuation.marketValue.minorUnits).toBe(120000)
    expect(valuation.investedCapital.minorUnits).toBe(100000)
    expect(valuation.unrealizedReturn.minorUnits).toBe(20000)
    expect(valuation.unrealizedReturnPercentage).toBeCloseTo(20)
    expect(valuation.pricedPositions).toBe(1)
  })

  it('converts foreign-currency positions into the base currency', () => {
    const position = makePosition({
      asset: { currency: 'USD' },
      quantity: 5,
      averageCostPerShare: fromMajor(100, 'USD'),
      lastPrice: fromMajor(110, 'USD'),
    })
    const fx = createStaticFxResolver({ 'USD:EUR': 0.9 })
    const valuation = calculatePortfolioValuation([position], 'EUR', fx)
    expect(valuation.marketValue.minorUnits).toBe(49500)
    expect(valuation.investedCapital.minorUnits).toBe(45000)
  })

  it('flags missing prices without throwing and without inventing value', () => {
    const position = makePosition({
      asset: { currency: 'USD' },
      quantity: 3,
      averageCostPerShare: fromMajor(10, 'USD'),
      lastPrice: null,
    })
    const valuation = calculatePortfolioValuation([position], 'USD', identityFxResolver)
    expect(valuation.marketValue.minorUnits).toBe(0)
    expect(valuation.pricedPositions).toBe(0)
    expect(valuation.missingPrices).toHaveLength(1)
  })

  it('flags missing FX instead of fabricating a rate', () => {
    const position = makePosition({
      asset: { currency: 'USD' },
      quantity: 5,
      averageCostPerShare: fromMajor(100, 'USD'),
      lastPrice: fromMajor(110, 'USD'),
    })
    const valuation = calculatePortfolioValuation([position], 'EUR', identityFxResolver)
    expect(valuation.marketValue.minorUnits).toBe(0)
    expect(valuation.missingFx).toHaveLength(1)
  })

  it('handles an empty portfolio', () => {
    const valuation = calculatePortfolioValuation([], 'EUR', identityFxResolver)
    expect(valuation.marketValue.minorUnits).toBe(0)
    expect(valuation.unrealizedReturn.minorUnits).toBe(0)
    expect(valuation.unrealizedReturnPercentage).toBe(0)
  })

  it('treats a zero-price asset as zero market value', () => {
    const position = makePosition({
      asset: { currency: 'EUR' },
      quantity: 10,
      averageCostPerShare: fromMajor(10, 'EUR'),
      lastPrice: fromMajor(0, 'EUR'),
    })
    const valuation = calculatePortfolioValuation([position], 'EUR', identityFxResolver)
    expect(valuation.marketValue.minorUnits).toBe(0)
    expect(valuation.unrealizedReturnPercentage).toBeCloseTo(-100)
  })
})

describe('return helpers', () => {
  it('returns 0 for a zero cost basis (no division by zero)', () => {
    expect(calculateReturnPercentage(zero('EUR'), fromMajor(100, 'EUR'))).toBe(0)
  })

  it('computes negative returns', () => {
    expect(calculateReturnPercentage(fromMajor(100, 'EUR'), fromMajor(80, 'EUR'))).toBeCloseTo(-20)
  })

  it('computes value change between two snapshots', () => {
    const change = calculateValueChange(fromMajor(120, 'USD'), fromMajor(100, 'USD'))
    expect(change.absolute.minorUnits).toBe(2000)
    expect(change.percentage).toBeCloseTo(20)
  })

  it('computes portfolio yield in points', () => {
    expect(calculatePortfolioYield(fromMajor(300, 'EUR'), fromMajor(10000, 'EUR'))).toBeCloseTo(3)
    expect(calculatePortfolioYield(zero('EUR'), zero('EUR'))).toBe(0)
  })
})

describe('average cost', () => {
  it('computes a moving average across buys', () => {
    const result = calculateAverageCost(
      [
        {
          transactionType: 'BUY',
          quantity: 10,
          price: fromMajor(100, 'USD'),
          fees: fromMajor(10, 'USD'),
          taxes: zero('USD'),
        },
        {
          transactionType: 'BUY',
          quantity: 10,
          price: fromMajor(120, 'USD'),
          fees: zero('USD'),
          taxes: zero('USD'),
        },
      ],
      'USD',
    )
    expect(result.quantity).toBe(20)
    expect(result.totalCost.minorUnits).toBe(221000)
    expect(result.averageCostPerShare?.minorUnits).toBe(11050)
  })

  it('reduces basis proportionally on sells', () => {
    const result = calculateAverageCost(
      [
        {
          transactionType: 'BUY',
          quantity: 10,
          price: fromMajor(100, 'USD'),
          fees: zero('USD'),
          taxes: zero('USD'),
        },
        {
          transactionType: 'SELL',
          quantity: 5,
          price: fromMajor(150, 'USD'),
          fees: zero('USD'),
          taxes: zero('USD'),
        },
      ],
      'USD',
    )
    expect(result.quantity).toBe(5)
    expect(result.totalCost.minorUnits).toBe(50000)
    expect(result.averageCostPerShare?.minorUnits).toBe(10000)
  })

  it('returns null average cost for an empty/closed position', () => {
    const result = calculateAverageCost([], 'USD')
    expect(result.quantity).toBe(0)
    expect(result.averageCostPerShare).toBeNull()
  })
})
