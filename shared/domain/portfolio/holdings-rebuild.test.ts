import { describe, expect, it } from 'vitest'
import { CurrencyMismatchError } from '../errors'
import { fromMajor } from '../money/money'
import type { Transaction, TransactionType } from '../transactions/transaction'
import { projectPortfolio } from './holdings-rebuild'

let counter = 0

function tx(
  assetId: string,
  transactionType: TransactionType,
  quantity: number,
  price: number,
  options: { fees?: number; taxes?: number; currency?: 'USD' | 'EUR'; date?: string } = {},
): Transaction {
  counter += 1
  const currency = options.currency ?? 'USD'
  return {
    id: `tx-${counter}`,
    portfolioId: 'p1',
    assetId,
    transactionType,
    quantity,
    price: fromMajor(price, currency),
    fees: fromMajor(options.fees ?? 0, currency),
    taxes: fromMajor(options.taxes ?? 0, currency),
    exchangeRate: 1,
    transactionDate: options.date ?? `2026-01-${String((counter % 27) + 1).padStart(2, '0')}`,
    notes: null,
    createdAt: `2026-01-${String((counter % 27) + 1).padStart(2, '0')}T00:00:00.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('projectPortfolio', () => {
  it('returns an empty projection for no transactions', () => {
    expect(projectPortfolio([])).toEqual({ holdings: [], realizedGains: [] })
  })

  it('computes quantity, cost and average from buys', () => {
    const { holdings } = projectPortfolio([
      tx('a', 'BUY', 10, 100, { fees: 5, date: '2026-01-01' }),
      tx('a', 'BUY', 10, 120, { date: '2026-02-01' }),
    ])
    const holding = holdings[0]
    expect(holding?.quantity).toBe(20)
    // 10*100 + 5 + 10*120 = 2205
    expect(holding?.totalCost.minorUnits).toBe(220500)
    expect(holding?.averageCostPerShare?.minorUnits).toBe(11025)
    expect(holding?.realizedGains.minorUnits).toBe(0)
  })

  it('realizes gains on sells using the moving average', () => {
    const { holdings, realizedGains } = projectPortfolio([
      tx('a', 'BUY', 10, 100, { date: '2026-01-01' }),
      tx('a', 'SELL', 5, 150, { fees: 2, date: '2026-02-01' }),
    ])
    const holding = holdings[0]
    expect(holding?.quantity).toBe(5)
    // cost removed = 5 * 100 = 500; proceeds = 5*150 - 2 = 748 -> gain 248
    expect(holding?.realizedGains.minorUnits).toBe(24800)
    expect(realizedGains[0]?.minorUnits).toBe(24800)
    expect(holding?.totalCost.minorUnits).toBe(50000)
  })

  it('closes a position fully and keeps realized gains', () => {
    const { holdings } = projectPortfolio([
      tx('a', 'BUY', 4, 50, { date: '2026-01-01' }),
      tx('a', 'SELL', 4, 40, { date: '2026-02-01' }),
    ])
    const holding = holdings[0]
    expect(holding?.quantity).toBe(0)
    expect(holding?.totalCost.minorUnits).toBe(0)
    expect(holding?.averageCostPerShare).toBeNull()
    expect(holding?.realizedGains.minorUnits).toBe(-4000)
  })

  it('supports fractional shares', () => {
    const { holdings } = projectPortfolio([tx('a', 'BUY', 0.5, 200, { date: '2026-01-01' })])
    expect(holdings[0]?.quantity).toBe(0.5)
    expect(holdings[0]?.totalCost.minorUnits).toBe(10000)
    expect(holdings[0]?.averageCostPerShare?.minorUnits).toBe(20000)
  })

  it('groups multiple assets independently and aggregates realized per currency', () => {
    const { holdings, realizedGains } = projectPortfolio([
      tx('a', 'BUY', 1, 100, { date: '2026-01-01' }),
      tx('a', 'SELL', 1, 110, { date: '2026-01-02' }),
      tx('b', 'BUY', 2, 10, { currency: 'EUR', date: '2026-01-01' }),
    ])
    expect(holdings).toHaveLength(2)
    expect(realizedGains).toHaveLength(1)
    expect(realizedGains[0]?.currency).toBe('USD')
    expect(realizedGains[0]?.minorUnits).toBe(1000)
  })

  it('throws on mixed currencies for the same asset', () => {
    expect(() =>
      projectPortfolio([
        tx('a', 'BUY', 1, 100, { currency: 'USD', date: '2026-01-01' }),
        tx('a', 'BUY', 1, 100, { currency: 'EUR', date: '2026-01-02' }),
      ]),
    ).toThrow(CurrencyMismatchError)
  })

  it('ignores transactions without an asset id', () => {
    const { holdings } = projectPortfolio([
      tx('a', 'BUY', 1, 100, { date: '2026-01-01' }),
      {
        ...tx('a', 'DEPOSIT', 0, 0, { date: '2026-01-03' }),
        assetId: null,
      },
    ])
    expect(holdings).toHaveLength(1)
  })

  it('ignores dividends when computing holdings', () => {
    const { holdings } = projectPortfolio([
      tx('a', 'BUY', 3, 100, { date: '2026-01-01' }),
      tx('a', 'DIVIDEND', 3, 2, { date: '2026-01-02' }),
    ])
    expect(holdings[0]?.quantity).toBe(3)
    expect(holdings[0]?.realizedGains.minorUnits).toBe(0)
  })
})
