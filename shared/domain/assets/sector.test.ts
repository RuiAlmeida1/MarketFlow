import { describe, expect, it } from 'vitest'
import { sectorFromIndustry } from './sector'

describe('sectorFromIndustry', () => {
  it('maps common Finnhub industries to sectors', () => {
    expect(sectorFromIndustry('Real Estate')).toBe('Real Estate')
    expect(sectorFromIndustry('Banking')).toBe('Financials')
    expect(sectorFromIndustry('Hotels, Restaurants & Leisure')).toBe(
      'Consumer Discretionary',
    )
    expect(sectorFromIndustry('Pharmaceuticals')).toBe('Healthcare')
    expect(sectorFromIndustry('Technology')).toBe('Technology')
    expect(sectorFromIndustry('Waste Management')).toBe('Industrials')
    expect(sectorFromIndustry('Utilities - Regulated Electric')).toBe('Utilities')
  })

  it('falls back to the raw label and handles empties', () => {
    expect(sectorFromIndustry('Something Custom')).toBe('Something Custom')
    expect(sectorFromIndustry(null)).toBeNull()
    expect(sectorFromIndustry('')).toBeNull()
  })
})
