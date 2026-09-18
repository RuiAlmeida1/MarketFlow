import type { MarketsResponse } from '../../shared/api/contracts'
import type { MarketDataProvider, MarketQuote } from '../../shared/domain'

/**
 * Development market data. Values are fictional but shaped like real quotes so
 * the UI can be built and tested before a vendor is wired in.
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

export class MarketDataService {
  constructor(private readonly provider: MarketDataProvider = new MockMarketDataProvider()) {}

  async getOverview(): Promise<MarketsResponse> {
    const quotes = await this.provider.getOverview()
    return { asOf: new Date().toISOString(), quotes }
  }
}
