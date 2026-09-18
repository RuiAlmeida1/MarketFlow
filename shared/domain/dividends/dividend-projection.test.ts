import { describe, expect, it } from 'vitest'
import { fromMajor } from '../money/money'
import type { Transaction, TransactionType } from '../transactions/transaction'
import { projectDividendPayments } from './dividend-projection'

let counter = 0

function tx(
  transactionType: TransactionType,
  amount: number,
  options: { assetId?: string | null; date?: string; currency?: 'EUR' | 'USD' } = {},
): Transaction {
  counter += 1
  const currency = options.currency ?? 'EUR'
  return {
    id: `tx-${counter}`,
    portfolioId: 'p1',
    assetId: options.assetId === undefined ? 'asset-1' : options.assetId,
    transactionType,
    quantity: 0,
    price: fromMajor(amount, currency),
    fees: fromMajor(0, currency),
    taxes: fromMajor(0, currency),
    exchangeRate: 1,
    transactionDate: options.date ?? '2026-09-16',
    notes: null,
    createdAt: `${options.date ?? '2026-09-16'}T00:00:00.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('projectDividendPayments', () => {
  it('pairs a dividend with its withholding tax on the same asset/date', () => {
    const payments = projectDividendPayments([
      tx('DIVIDEND', 1.6),
      tx('TAX', 0.24),
    ])
    expect(payments).toHaveLength(1)
    expect(payments[0]).toMatchObject({ assetId: 'asset-1', date: '2026-09-16', currency: 'EUR' })
    expect(payments[0]?.amountGross.minorUnits).toBe(160)
    expect(payments[0]?.taxAmount.minorUnits).toBe(24)
    expect(payments[0]?.amountNet.minorUnits).toBe(136)
  })

  it('nets gross when there is no withholding tax', () => {
    const payments = projectDividendPayments([tx('DIVIDEND', 2.34)])
    expect(payments[0]?.amountNet.minorUnits).toBe(234)
    expect(payments[0]?.taxAmount.minorUnits).toBe(0)
  })

  it('keeps different assets and dates separate', () => {
    const payments = projectDividendPayments([
      tx('DIVIDEND', 1, { assetId: 'a', date: '2026-01-10' }),
      tx('DIVIDEND', 2, { assetId: 'a', date: '2026-04-10' }),
      tx('DIVIDEND', 3, { assetId: 'b', date: '2026-01-10' }),
    ])
    expect(payments).toHaveLength(3)
  })

  it('ignores cash events without an asset and non-dividend types', () => {
    const payments = projectDividendPayments([
      tx('DIVIDEND', 5, { assetId: null }),
      tx('INTEREST', 5),
      tx('DEPOSIT', 100, { assetId: null }),
    ])
    expect(payments).toEqual([])
  })

  it('drops fully empty groups', () => {
    expect(projectDividendPayments([])).toEqual([])
  })
})
