import type { CurrencyCode } from '../money/currency'
import { type Money, addMoney, sumMoney, zero } from '../money/money'
import type { FxResolver } from '../fx/exchange-rate'
import { convertWithResolver } from '../fx/convert'

export const DIVIDEND_STATUSES = ['EXPECTED', 'CONFIRMED', 'RECEIVED', 'CANCELLED'] as const
export type DividendStatus = (typeof DIVIDEND_STATUSES)[number]

export const DIVIDEND_STATUS_LABELS: Record<DividendStatus, string> = {
  EXPECTED: 'Expected',
  CONFIRMED: 'Confirmed',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
}

export function isDividendStatus(value: unknown): value is DividendStatus {
  return typeof value === 'string' && (DIVIDEND_STATUSES as readonly string[]).includes(value)
}

export interface DividendPayment {
  readonly id: string
  readonly portfolioId: string
  readonly assetId: string
  readonly amountGross: Money
  readonly taxAmount: Money
  readonly amountNet: Money
  readonly currency: CurrencyCode
  readonly exDate: string
  readonly recordDate: string | null
  readonly paymentDate: string | null
  readonly shares: number
  readonly dividendPerShare: Money
  readonly status: DividendStatus
  readonly createdAt: string
  readonly updatedAt: string
}

export interface MonthlyDividendIncome {
  readonly month: number
  readonly received: Money
  readonly projected: Money
  readonly total: Money
}

/** Date used to place income in a period, falling back through the lifecycle. */
export function dividendIncomeDate(payment: DividendPayment): string | null {
  return payment.paymentDate ?? payment.exDate ?? payment.recordDate
}

export function calculateDividendIncome(
  payments: readonly DividendPayment[],
  year: number,
  baseCurrency: CurrencyCode,
  fx: FxResolver,
): MonthlyDividendIncome[] {
  const months = Array.from({ length: 12 }, (_, month) => ({
    month,
    received: zero(baseCurrency),
    projected: zero(baseCurrency),
  }))

  for (const payment of payments) {
    if (payment.status === 'CANCELLED') continue
    const date = dividendIncomeDate(payment)
    if (!date) continue
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== year) continue

    const bucket = months[parsed.getUTCMonth()]
    if (!bucket) continue

    const converted = convertWithResolver(payment.amountNet, baseCurrency, fx, date)
    if (payment.status === 'RECEIVED') {
      bucket.received = addMoney(bucket.received, converted.value)
    } else {
      bucket.projected = addMoney(bucket.projected, converted.value)
    }
  }

  return months.map((entry) => ({
    ...entry,
    total: addMoney(entry.received, entry.projected),
  }))
}

export function calculateAnnualDividendIncome(
  payments: readonly DividendPayment[],
  year: number,
  baseCurrency: CurrencyCode,
  fx: FxResolver,
): Money {
  const months = calculateDividendIncome(payments, year, baseCurrency, fx)
  return sumMoney(
    months.map((entry) => entry.total),
    baseCurrency,
  )
}
