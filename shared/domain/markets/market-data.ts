/**
 * Market data is consumed through a provider port so the UI never depends on a
 * specific vendor. Phase 1 ships a mock provider; Phase 2 can swap in Finnhub,
 * Twelve Data, Alpha Vantage, Polygon or FMP without touching components.
 */
export type MarketInstrumentKind =
  | 'index'
  | 'rate'
  | 'volatility'
  | 'commodity'
  | 'crypto'
  | 'bond'

export interface MarketQuote {
  readonly symbol: string
  readonly name: string
  readonly kind: MarketInstrumentKind
  readonly value: number
  readonly change: number
  readonly changePercentage: number
}

export interface MarketDataProvider {
  getOverview(): Promise<MarketQuote[]>
}

/** A single-instrument quote used to price portfolio holdings. */
export interface SymbolQuote {
  readonly symbol: string
  readonly price: number
  readonly previousClose: number
  readonly change: number
  readonly changePercentage: number
  /** Unix epoch milliseconds of the quote. */
  readonly timestamp: number
}

export interface SymbolQuoteProvider {
  getSymbolQuote(symbol: string): Promise<SymbolQuote | null>
}
