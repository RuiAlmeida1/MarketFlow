import type { CurrencyCode } from '../money/currency'
import type { Money } from '../money/money'

/**
 * Precomputed daily portfolio value. Snapshots let historical charts be served
 * without replaying transactions or recomputing valuations on every request.
 */
export interface PortfolioSnapshot {
  readonly id: string
  readonly portfolioId: string
  readonly snapshotDate: string
  readonly marketValue: Money
  readonly investedCapital: Money
  readonly cashValue: Money
  readonly income: Money
  readonly baseCurrency: CurrencyCode
  readonly createdAt: string
}
