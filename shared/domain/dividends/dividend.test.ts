import { describe, expect, it } from 'vitest'
import { createStaticFxResolver, identityFxResolver } from '../fx/exchange-rate'
import { fromMajor } from '../money/money'
import {
  calculateAnnualDividendIncome,
  calculateDividendIncome,
  type DividendPayment,
} from './dividend'

function payment(overrides: Partial<DividendPayment>): DividendPayment {
  return {
    id: 'div-1',
    portfolioId: 'p1',
    assetId: 'a1',
    amountGross: fromMajor(100, 'USD'),
    taxAmount: fromMajor(15, 'USD'),
    amountNet: fromMajor(85, 'USD'),
    currency: 'USD',
    exDate: '2024-03-15',
    recordDate: null,
    paymentDate: '2024-03-28',
    shares: 10,
    dividendPerShare: fromMajor(10, 'USD'),
    status: 'RECEIVED',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('dividend income', () => {
  it('aggregates received and projected income by month', () => {
    const months = calculateDividendIncome(
      [
        payment({ id: 'a', status: 'RECEIVED', paymentDate: '2024-03-28' }),
        payment({ id: 'b', status: 'EXPECTED', paymentDate: '2024-06-28' }),
        payment({ id: 'c', status: 'CANCELLED', paymentDate: '2024-06-28' }),
      ],
      2024,
      'USD',
      identityFxResolver,
    )
    expect(months).toHaveLength(12)
    expect(months[2]?.received.minorUnits).toBe(8500)
    expect(months[5]?.projected.minorUnits).toBe(8500)
    expect(months[5]?.total.minorUnits).toBe(8500)
  })

  it('excludes cancelled payments entirely', () => {
    const months = calculateDividendIncome(
      [payment({ status: 'CANCELLED' })],
      2024,
      'USD',
      identityFxResolver,
    )
    expect(months.every((month) => month.total.minorUnits === 0)).toBe(true)
  })

  it('converts foreign dividends into the base currency', () => {
    const months = calculateDividendIncome(
      [payment({ amountNet: fromMajor(100, 'USD'), status: 'RECEIVED' })],
      2024,
      'EUR',
      createStaticFxResolver({ 'USD:EUR': 0.9 }),
    )
    expect(months[2]?.received.minorUnits).toBe(9000)
  })

  it('ignores payments outside the requested year', () => {
    const months = calculateDividendIncome(
      [payment({ paymentDate: '2023-03-28' })],
      2024,
      'USD',
      identityFxResolver,
    )
    expect(months.every((month) => month.total.minorUnits === 0)).toBe(true)
  })

  it('computes annual income across all months', () => {
    const annual = calculateAnnualDividendIncome(
      [
        payment({ id: 'a', paymentDate: '2024-03-28' }),
        payment({ id: 'b', paymentDate: '2024-09-28' }),
      ],
      2024,
      'USD',
      identityFxResolver,
    )
    expect(annual.minorUnits).toBe(17000)
  })
})
