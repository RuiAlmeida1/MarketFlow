import { z } from 'zod'
import type { HistoricalPricePoint, HistoricalPriceProvider } from '../../shared/domain'
import { toDateKey } from '../../shared/utils/date'

const yahooSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z
            .object({
              regularMarketPrice: z.number().optional(),
              previousClose: z.number().optional(),
              chartPreviousClose: z.number().optional(),
            })
            .optional(),
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({
            quote: z.array(z.object({ close: z.array(z.number().nullable()) })),
          }),
        }),
      )
      .optional(),
  }),
})

const DEFAULT_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
const DEFAULT_TIMEOUT_MS = 8_000

export interface YahooHistoricalPriceProviderOptions {
  readonly baseUrl?: string
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
}

/**
 * Free daily history from Yahoo Finance (no API key). Used to backfill the
 * performance chart; failures are non-fatal.
 */
export class YahooHistoricalPriceProvider implements HistoricalPriceProvider {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number

  constructor(options: YahooHistoricalPriceProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init))
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async getDailyCloses(
    symbol: string,
    fromDate: string,
    toDate: string,
  ): Promise<HistoricalPricePoint[]> {
    const from = Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000)
    const to = Math.floor(new Date(`${toDate}T23:59:59Z`).getTime() / 1000)
    const url = new URL(`${this.baseUrl}/${encodeURIComponent(symbol)}`)
    url.searchParams.set('period1', String(from))
    url.searchParams.set('period2', String(to))
    url.searchParams.set('interval', '1d')

    const fetchFn = this.fetcher
    const response = await fetchFn(url.toString(), {
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; MarketFlow/1.0)',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!response.ok) {
      throw new Error(`Yahoo responded with status ${response.status}.`)
    }

    const parsed = yahooSchema.safeParse(await response.json())
    const result = parsed.success ? parsed.data.chart.result?.[0] : undefined
    if (!result?.timestamp) return []

    const closes = result.indicators.quote[0]?.close ?? []
    const points: HistoricalPricePoint[] = []
    for (let index = 0; index < result.timestamp.length; index += 1) {
      const timestamp = result.timestamp[index]
      const close = closes[index]
      if (timestamp === undefined || close == null || close <= 0) continue
      points.push({ date: toDateKey(new Date(timestamp * 1000)), close })
    }
    return points
  }

  /** Latest (near real-time) price, used for live FX. */
  async getLatestPrice(symbol: string): Promise<number | null> {
    const quote = await this.getLatestQuote(symbol)
    return quote?.price ?? null
  }

  /** Latest price + previous close from the Yahoo chart metadata. */
  async getLatestQuote(
    symbol: string,
  ): Promise<{ price: number; previousClose: number } | null> {
    const url = new URL(`${this.baseUrl}/${encodeURIComponent(symbol)}`)
    url.searchParams.set('range', '1d')
    url.searchParams.set('interval', '1m')

    const response = await this.fetcher(url.toString(), {
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; MarketFlow/1.0)',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!response.ok) return null

    const parsed = yahooSchema.safeParse(await response.json())
    const result = parsed.success ? parsed.data.chart.result?.[0] : undefined
    if (!result) return null

    const meta = result.meta
    const price =
      meta?.regularMarketPrice ??
      (result.indicators.quote[0]?.close ?? []).filter(
        (value): value is number => value != null && value > 0,
      ).pop()
    if (price == null || price <= 0) return null

    const previousClose = meta?.previousClose ?? meta?.chartPreviousClose ?? price
    return { price, previousClose }
  }
}
