import type { Money } from '../money/money'

export interface AssetPriceRecord {
  readonly id: string
  readonly assetId: string
  readonly price: Money
  readonly priceDate: string
  readonly timestamp: string
  readonly source: string
  readonly createdAt: string
}
