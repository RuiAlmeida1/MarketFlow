import type { CurrencyCode } from '../money/currency'

/** Canonical asset taxonomy. Never use free-form strings for asset types. */
export const ASSET_TYPES = [
  'STOCK',
  'ETF',
  'REIT',
  'BOND',
  'FUND',
  'CRYPTO',
  'CASH',
  'OTHER',
] as const

export type AssetType = (typeof ASSET_TYPES)[number]

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  STOCK: 'Stock',
  ETF: 'ETF',
  REIT: 'REIT',
  BOND: 'Bond',
  FUND: 'Fund',
  CRYPTO: 'Crypto',
  CASH: 'Cash',
  OTHER: 'Other',
}

export function isAssetType(value: unknown): value is AssetType {
  return typeof value === 'string' && (ASSET_TYPES as readonly string[]).includes(value)
}

export interface Asset {
  readonly id: string
  readonly symbol: string
  readonly name: string
  readonly assetType: AssetType
  readonly exchange: string | null
  readonly currency: CurrencyCode
  readonly isin: string | null
  readonly sector: string | null
  readonly industry: string | null
  readonly country: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

/** Stable, human-readable identifier that never assumes a ticker is unique. */
export function assetIdentifier(asset: Pick<Asset, 'symbol' | 'exchange'>): string {
  return asset.exchange ? `${asset.symbol} · ${asset.exchange}` : asset.symbol
}
