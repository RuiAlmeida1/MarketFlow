import type { MarketsResponse } from '../../shared/api/contracts'
import type { MarketDataProvider, MarketQuote } from '../../shared/domain'

const DEFAULT_CACHE_TTL_MS = 60_000

/**
 * Development market data. Values are fictional but shaped like real quotes so
 * the UI can be built and tested before a live vendor is configured.
 */
const MOCK_MARKET_QUOTES: readonly MarketQuote[] = [
  {
    symbol: '^GSPC',
    name: 'S&P 500',
    kind: 'index',
    value: 6180.25,
    change: 18.4,
    changePercentage: 0.3,
  },
  {
    symbol: '^IXIC',
    name: 'NASDAQ Composite',
    kind: 'index',
    value: 20240.5,
    change: -55.1,
    changePercentage: -0.27,
  },
  {
    symbol: '^DJI',
    name: 'Dow Jones Industrial Average',
    kind: 'index',
    value: 44210.8,
    change: 112.3,
    changePercentage: 0.25,
  },
  {
    symbol: '^VIX',
    name: 'CBOE Volatility Index',
    kind: 'volatility',
    value: 15.42,
    change: -0.35,
    changePercentage: -2.22,
  },
  {
    symbol: '^TNX',
    name: 'US 10Y Treasury Yield',
    kind: 'rate',
    value: 4.12,
    change: 0.03,
    changePercentage: 0.73,
  },
  {
    symbol: 'EURUSD',
    name: 'EUR/USD',
    kind: 'rate',
    value: 1.0852,
    change: 0.0011,
    changePercentage: 0.1,
  },
  {
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    kind: 'commodity',
    value: 2685.4,
    change: 9.6,
    changePercentage: 0.36,
  },
]

export class MockMarketDataProvider implements MarketDataProvider {
  async getOverview(): Promise<MarketQuote[]> {
    return [...MOCK_MARKET_QUOTES]
  }
}

/**
 * Applies a short-lived cache in front of whichever provider is configured.
 * This protects upstream rate limits (Finnhub free tier: 60 req/min) and lets
 * the dashboard reuse a single market snapshot per request. If the provider
 * fails and a previous snapshot exists, the stale snapshot is served.
 */
export class MarketDataService {
  private cache: { data: MarketsResponse; expiresAt: number } | null = null

  constructor(
    private readonly provider: MarketDataProvider = new MockMarketDataProvider(),
    private readonly ttlMs = DEFAULT_CACHE_TTL_MS,
  ) {}

  async getOverview(): Promise<MarketsResponse> {
    const now = Date.now()
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.data
    }

    try {
      const quotes = await this.provider.getOverview()
      const response: MarketsResponse = { asOf: new Date().toISOString(), quotes }
      // Only cache non-empty results so transient provider issues are retried.
      if (quotes.length > 0) {
        this.cache = { data: response, expiresAt: now + this.ttlMs }
      }
      return response
    } catch (error) {
      if (this.cache) {
        console.warn('[market-data] provider failed, serving stale snapshot', error)
        return this.cache.data
      }
      throw error
    }
  }
}
