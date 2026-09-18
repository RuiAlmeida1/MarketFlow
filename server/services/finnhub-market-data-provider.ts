import { z } from 'zod'
import { ExternalServiceError } from '../../shared/domain/errors'
import type {
  MarketDataProvider,
  MarketInstrumentKind,
  MarketQuote,
} from '../../shared/domain/markets/market-data'

/**
 * Finnhub `/quote` response:
 *   c  current price
 *   d  change
 *   dp percent change
 *   pc previous close
 */
const finnhubQuoteSchema = z.object({
  c: z.number(),
  d: z.number().nullable().optional(),
  dp: z.number().nullable().optional(),
  pc: z.number().optional(),
})

export interface FinnhubInstrument {
  readonly symbol: string
  readonly name: string
  readonly kind: MarketInstrumentKind
}

/**
 * Instruments shown in the market overview. Finnhub symbol formats vary by
 * asset class (equities `AAPL`, indices `^GSPC`, forex `OANDA:EUR_USD`).
 * Unsupported symbols on a given plan are skipped, never fatal.
 */
export const DEFAULT_FINNHUB_INSTRUMENTS: readonly FinnhubInstrument[] = [
  { symbol: '^GSPC', name: 'S&P 500', kind: 'index' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', kind: 'index' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', kind: 'index' },
  { symbol: '^VIX', name: 'CBOE Volatility Index', kind: 'volatility' },
  { symbol: '^TNX', name: 'US 10Y Treasury Yield', kind: 'rate' },
  { symbol: 'OANDA:EUR_USD', name: 'EUR/USD', kind: 'rate' },
  { symbol: 'OANDA:XAU_USD', name: 'Gold Spot', kind: 'commodity' },
]

export interface FinnhubMarketDataProviderOptions {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly instruments?: readonly FinnhubInstrument[]
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
}

const DEFAULT_BASE_URL = 'https://finnhub.io/api/v1'
const DEFAULT_TIMEOUT_MS = 8_000

/**
 * Live market data via Finnhub. The API key stays on the worker; the browser
 * only ever talks to our own `/api/markets` endpoint.
 */
export class FinnhubMarketDataProvider implements MarketDataProvider {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly instruments: readonly FinnhubInstrument[]
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number

  constructor(options: FinnhubMarketDataProviderOptions) {
    if (!options.apiKey) {
      throw new Error('FinnhubMarketDataProvider requires an API key.')
    }
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.instruments = options.instruments ?? DEFAULT_FINNHUB_INSTRUMENTS
    this.fetcher = options.fetcher ?? fetch
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async getOverview(): Promise<MarketQuote[]> {
    const results = await Promise.allSettled(
      this.instruments.map((instrument) => this.fetchInstrument(instrument)),
    )

    const quotes: MarketQuote[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value) quotes.push(result.value)
      } else {
        console.warn('[finnhub] instrument fetch failed', result.reason)
      }
    }
    return quotes
  }

  private async fetchInstrument(
    instrument: FinnhubInstrument,
  ): Promise<MarketQuote | null> {
    const url = new URL(`${this.baseUrl}/quote`)
    url.searchParams.set('symbol', instrument.symbol)
    url.searchParams.set('token', this.apiKey)

    const response = await this.fetcher(url.toString(), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      throw new ExternalServiceError(
        `Market data provider responded with status ${response.status}.`,
      )
    }

    const payload: unknown = await response.json()
    const parsed = finnhubQuoteSchema.safeParse(payload)
    if (!parsed.success) {
      throw new ExternalServiceError('Market data provider returned an unexpected payload.')
    }

    const { c, d, dp } = parsed.data
    // Finnhub returns c=0 for symbols that are unknown or not entitled.
    if (c === 0) return null

    return {
      symbol: instrument.symbol,
      name: instrument.name,
      kind: instrument.kind,
      value: c,
      change: d ?? 0,
      changePercentage: dp ?? 0,
    }
  }
}
