import { z } from 'zod'
import { ExternalServiceError } from '../../shared/domain/errors'
import type {
  MarketDataProvider,
  MarketInstrumentKind,
  MarketQuote,
  SymbolQuote,
  SymbolQuoteProvider,
} from '../../shared/domain/markets/market-data'

/**
 * Finnhub `/quote` response:
 *   c  current price
 *   d  change
 *   dp percent change
 *   pc previous close
 *   t  last trade timestamp (unix seconds)
 */
const finnhubQuoteSchema = z.object({
  c: z.number(),
  d: z.number().nullable().optional(),
  dp: z.number().nullable().optional(),
  pc: z.number().optional(),
  t: z.number().optional(),
})

type FinnhubQuotePayload = z.infer<typeof finnhubQuoteSchema>

export interface FinnhubInstrument {
  readonly symbol: string
  readonly name: string
  readonly kind: MarketInstrumentKind
}

/**
 * Instruments shown in the market overview.
 *
 * Finnhub's free plan exposes US equities/ETFs but gates indices, forex and
 * spot commodities, so liquid ETFs are used as proxies. Symbols your plan does
 * not entitle (or that return no price) are simply skipped, never fatal.
 * Upgrading allows switching back to `^GSPC`, `^IXIC`, `^DJI`, `OANDA:EUR_USD`,
 * etc.
 */
export const DEFAULT_FINNHUB_INSTRUMENTS: readonly FinnhubInstrument[] = [
  { symbol: 'SPY', name: 'S&P 500 (SPY)', kind: 'index' },
  { symbol: 'QQQ', name: 'NASDAQ 100 (QQQ)', kind: 'index' },
  { symbol: 'DIA', name: 'Dow Jones (DIA)', kind: 'index' },
  { symbol: 'VIXY', name: 'Volatility (VIXY)', kind: 'volatility' },
  { symbol: 'TLT', name: 'US 20Y+ Treasury (TLT)', kind: 'bond' },
  { symbol: 'GLD', name: 'Gold (GLD)', kind: 'commodity' },
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
export class FinnhubMarketDataProvider
  implements MarketDataProvider, SymbolQuoteProvider
{
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
    // Never store the bare global `fetch`: invoking it as an object method
    // ("illegal invocation") fails in Workers. Wrap it so `this` is correct.
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init))
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

  /** Quote for a single symbol, used to price portfolio holdings. */
  async getSymbolQuote(symbol: string): Promise<SymbolQuote | null> {
    const payload = await this.requestQuote(symbol)
    if (!payload || payload.c === 0) return null
    return {
      symbol,
      price: payload.c,
      previousClose: payload.pc ?? 0,
      change: payload.d ?? 0,
      changePercentage: payload.dp ?? 0,
      timestamp: payload.t ? payload.t * 1000 : Date.now(),
    }
  }

  private async fetchInstrument(
    instrument: FinnhubInstrument,
  ): Promise<MarketQuote | null> {
    const payload = await this.requestQuote(instrument.symbol)
    // Finnhub returns c=0 for symbols that are unknown or not entitled.
    if (!payload || payload.c === 0) return null

    return {
      symbol: instrument.symbol,
      name: instrument.name,
      kind: instrument.kind,
      value: payload.c,
      change: payload.d ?? 0,
      changePercentage: payload.dp ?? 0,
    }
  }

  private async requestQuote(symbol: string): Promise<FinnhubQuotePayload | null> {
    const url = new URL(`${this.baseUrl}/quote`)
    url.searchParams.set('symbol', symbol)
    url.searchParams.set('token', this.apiKey)

    const fetchFn = this.fetcher
    const response = await fetchFn(url.toString(), {
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
    return parsed.data
  }
}
