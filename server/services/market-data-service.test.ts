import { describe, expect, it, vi } from 'vitest'
import type { MarketDataProvider, MarketQuote } from '../../shared/domain'
import { MarketDataService, MockMarketDataProvider } from './market-data-service'

const quote = (symbol: string): MarketQuote => ({
  symbol,
  name: symbol,
  kind: 'index',
  value: 1,
  change: 0,
  changePercentage: 0,
})

describe('MarketDataService', () => {
  it('caches provider results within the TTL', async () => {
    const provider: MarketDataProvider = {
      getOverview: vi.fn(async () => [quote('A')]),
    }
    const service = new MarketDataService(provider, 60_000)

    await service.getOverview()
    await service.getOverview()

    expect(provider.getOverview).toHaveBeenCalledOnce()
  })

  it('serves a stale snapshot when the provider fails after a success', async () => {
    let shouldFail = false
    const provider: MarketDataProvider = {
      getOverview: vi.fn(async () => {
        if (shouldFail) throw new Error('provider down')
        return [quote('A')]
      }),
    }
    const service = new MarketDataService(provider, 0)

    const first = await service.getOverview()
    expect(first.quotes).toHaveLength(1)

    shouldFail = true
    const second = await service.getOverview()
    expect(second.quotes).toHaveLength(1)
  })

  it('propagates the error when the provider fails and no cache exists', async () => {
    const provider: MarketDataProvider = {
      getOverview: async () => {
        throw new Error('provider down')
      },
    }
    const service = new MarketDataService(provider, 0)

    await expect(service.getOverview()).rejects.toThrow('provider down')
  })

  it('defaults to the mock provider', async () => {
    const service = new MarketDataService(new MockMarketDataProvider())
    const result = await service.getOverview()
    expect(result.quotes.length).toBeGreaterThan(0)
  })
})
