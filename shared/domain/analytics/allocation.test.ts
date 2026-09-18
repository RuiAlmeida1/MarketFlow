import { describe, expect, it } from 'vitest'
import { identityFxResolver } from '../fx/exchange-rate'
import { fromMajor } from '../money/money'
import { makePosition } from '../testing/factories'
import { calculateAllocation, allocationKey } from './allocation'

const positions = [
  makePosition({
    asset: { currency: 'USD', sector: 'Technology', assetType: 'STOCK', country: 'US' },
    quantity: 10,
    lastPrice: fromMajor(100, 'USD'),
  }),
  makePosition({
    asset: { currency: 'USD', sector: 'Technology', assetType: 'ETF', country: 'US' },
    quantity: 10,
    lastPrice: fromMajor(50, 'USD'),
  }),
  makePosition({
    asset: {
      currency: 'USD',
      sector: 'Real Estate',
      assetType: 'REIT',
      country: 'US',
    },
    quantity: 10,
    lastPrice: fromMajor(50, 'USD'),
  }),
]

describe('allocation', () => {
  it('groups by sector and orders by value', () => {
    const slices = calculateAllocation(positions, 'USD', identityFxResolver, 'sector')
    expect(slices.map((slice) => slice.key)).toEqual(['Technology', 'Real Estate'])
    expect(slices[0]?.value.minorUnits).toBe(150000)
    expect(slices[0]?.count).toBe(2)
  })

  it('weights sum to 100% of the portfolio value', () => {
    const slices = calculateAllocation(positions, 'USD', identityFxResolver, 'sector')
    const totalWeight = slices.reduce((sum, slice) => sum + slice.weight, 0)
    expect(totalWeight).toBeCloseTo(100, 5)
  })

  it('supports asset type, currency and country dimensions', () => {
    expect(
      calculateAllocation(positions, 'USD', identityFxResolver, 'assetType').map(
        (slice) => slice.key,
      ),
    ).toEqual(['STOCK', 'ETF', 'REIT'])
    expect(
      calculateAllocation(positions, 'USD', identityFxResolver, 'country')[0]?.key,
    ).toBe('US')
    expect(
      calculateAllocation(positions, 'USD', identityFxResolver, 'currency')[0]?.key,
    ).toBe('USD')
  })

  it('returns an empty allocation for an empty portfolio', () => {
    expect(calculateAllocation([], 'EUR', identityFxResolver, 'sector')).toEqual([])
  })

  it('labels assets with missing metadata as Unclassified', () => {
    const asset = makePosition({ asset: { sector: null }, lastPrice: fromMajor(1, 'USD') })
    expect(allocationKey(asset.asset, 'sector')).toBe('Unclassified')
  })
})
