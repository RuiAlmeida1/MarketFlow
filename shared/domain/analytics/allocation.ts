import type { Asset } from '../assets/asset'
import type { CurrencyCode } from '../money/currency'
import { type Money, addMoney } from '../money/money'
import type { FxResolver } from '../fx/exchange-rate'
import type { Position } from '../portfolio/holdings'
import { calculatePortfolioValuation } from '../portfolio/valuation'

export const ALLOCATION_DIMENSIONS = ['sector', 'assetType', 'currency', 'country'] as const
export type AllocationDimension = (typeof ALLOCATION_DIMENSIONS)[number]

export const ALLOCATION_DIMENSION_LABELS: Record<AllocationDimension, string> = {
  sector: 'Sector',
  assetType: 'Asset type',
  currency: 'Currency',
  country: 'Country',
}

const UNCLASSIFIED = 'Unclassified'

export function allocationKey(asset: Asset, dimension: AllocationDimension): string {
  switch (dimension) {
    case 'sector':
      return asset.sector ?? UNCLASSIFIED
    case 'assetType':
      return asset.assetType
    case 'currency':
      return asset.currency
    case 'country':
      return asset.country ?? UNCLASSIFIED
  }
}

export interface AllocationSlice {
  readonly key: string
  readonly label: string
  readonly value: Money
  readonly weight: number
  readonly count: number
}

/**
 * Groups positions by a dimension and computes each bucket's market value and
 * weight. Values are exact sums (never reallocated) so they always reconcile
 * with the portfolio total; weights are derived from them.
 */
export function calculateAllocation(
  positions: readonly Position[],
  baseCurrency: CurrencyCode,
  fx: FxResolver,
  dimension: AllocationDimension,
  asOf?: string,
): AllocationSlice[] {
  const valuation = calculatePortfolioValuation(positions, baseCurrency, fx, asOf)
  const total = valuation.marketValue
  const buckets = new Map<string, { value: Money; count: number }>()

  for (const priced of valuation.positions) {
    const key = allocationKey(priced.position.asset, dimension)
    const existing = buckets.get(key)
    if (existing) {
      existing.value = addMoney(existing.value, priced.marketValue)
      existing.count += 1
    } else {
      buckets.set(key, { value: priced.marketValue, count: 1 })
    }
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => ({
      key,
      label: key,
      value: bucket.value,
      count: bucket.count,
      weight: total.minorUnits === 0 ? 0 : (bucket.value.minorUnits / total.minorUnits) * 100,
    }))
    .sort((a, b) => b.value.minorUnits - a.value.minorUnits)
}
