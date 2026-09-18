import type { Asset } from '../assets/asset'
import type { Money } from '../money/money'
import type { Position } from '../portfolio/holdings'

let assetCounter = 0

export function makeAsset(overrides: Partial<Asset> = {}): Asset {
  assetCounter += 1
  return {
    id: `asset-${assetCounter}`,
    symbol: `SYM${assetCounter}`,
    name: `Asset ${assetCounter}`,
    assetType: 'STOCK',
    exchange: 'NASDAQ',
    currency: 'USD',
    isin: null,
    sector: 'Technology',
    industry: null,
    country: 'US',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export interface PositionInput {
  asset?: Partial<Asset>
  quantity?: number
  averageCostPerShare?: Money | null
  totalCost?: Money | null
  lastPrice?: Money | null
  priceDate?: string | null
}

export function makePosition(input: PositionInput = {}): Position {
  return {
    asset: makeAsset(input.asset),
    quantity: input.quantity ?? 10,
    averageCostPerShare: input.averageCostPerShare ?? null,
    totalCost: input.totalCost ?? null,
    lastPrice: input.lastPrice ?? null,
    priceDate: input.priceDate ?? null,
  }
}
