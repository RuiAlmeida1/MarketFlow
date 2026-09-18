import type { Asset } from '../assets/asset'
import type { CurrencyCode } from '../money/currency'
import type { Money } from '../money/money'

/**
 * Persisted holding snapshot.
 *
 * IMPORTANT: transactions are the future source of truth. Holdings are a
 * cache/projection that MUST remain reconstructable from the transaction log.
 * Never mutate a holding in a way that cannot be derived by replaying
 * transactions.
 */
export interface HoldingRecord {
  readonly id: string
  readonly portfolioId: string
  readonly assetId: string
  readonly quantity: number
  readonly averageCostMinor: number
  readonly totalCostMinor: number
  readonly currency: CurrencyCode
  readonly createdAt: string
  readonly updatedAt: string
}

/**
 * A position is the analytical projection of a holding enriched with the asset
 * metadata and the latest known price. It is the unit of work for all portfolio
 * calculations.
 */
export interface Position {
  readonly asset: Asset
  readonly quantity: number
  readonly averageCostPerShare: Money | null
  readonly totalCost: Money | null
  readonly lastPrice: Money | null
  readonly priceDate: string | null
}

export function isShortPosition(position: Position): boolean {
  return position.quantity < 0
}

export function isFractionalPosition(position: Position): boolean {
  return !Number.isInteger(position.quantity)
}
