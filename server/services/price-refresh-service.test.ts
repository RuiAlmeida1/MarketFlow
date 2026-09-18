import { describe, expect, it } from 'vitest'
import { isQuoteSupported } from './price-refresh-service'

const base = { assetType: 'STOCK' as const, exchange: 'NASDAQ', country: 'US' }

describe('isQuoteSupported', () => {
  it('supports US equities, ETFs and REITs', () => {
    expect(isQuoteSupported(base)).toBe(true)
    expect(isQuoteSupported({ ...base, assetType: 'ETF' })).toBe(true)
    expect(isQuoteSupported({ ...base, assetType: 'REIT' })).toBe(true)
  })

  it('rejects unsupported asset types', () => {
    expect(isQuoteSupported({ ...base, assetType: 'CRYPTO' })).toBe(false)
    expect(isQuoteSupported({ ...base, assetType: 'CASH' })).toBe(false)
    expect(isQuoteSupported({ ...base, assetType: 'BOND' })).toBe(false)
  })

  it('supports US-listed instruments by exchange even when country differs', () => {
    expect(isQuoteSupported({ ...base, country: 'IE', exchange: 'NYSE' })).toBe(true)
  })

  it('rejects non-US exchanges without a US country', () => {
    expect(isQuoteSupported({ ...base, country: 'IE', exchange: 'XETRA' })).toBe(false)
    expect(isQuoteSupported({ ...base, country: null, exchange: null })).toBe(false)
  })
})
