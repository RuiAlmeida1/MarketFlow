import type { CurrencyCode } from '../money/currency'
import type { Money } from '../money/money'

export interface Watchlist {
  readonly id: string
  readonly userId: string
  readonly name: string
  readonly isDefault: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WatchlistItem {
  readonly id: string
  readonly watchlistId: string
  readonly assetId: string
  readonly targetPrice: Money | null
  readonly targetCurrency: CurrencyCode | null
  readonly notes: string | null
  readonly createdAt: string
  readonly updatedAt: string
}
