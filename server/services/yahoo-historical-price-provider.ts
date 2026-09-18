import { z } from 'zod'
import type { Asset, HistoricalPricePoint, HistoricalPriceProvider } from '../../shared/domain'
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

/** Exchange -> Yahoo symbol suffix (XETRA -> `.DE`, LSE -> `.L`, ...). */
const EXCHANGE_SUFFIX: Record<string, string> = {
  XETRA: '.DE',
  LSE: '.L',
  EURONEXT: '.PA',
  BME: '.MC',
  BORSA_ITALIANA: '.MI',
  SIX: '.SW',
  TSE: '.T',
  HKEX: '.HK',
  TSX: '.TO',
  ASX: '.AX',
  NASDAQ_HELSINKI: '.HE',
  OMX: '.ST',
}

/**
 * Maps one of our assets to a Yahoo symbol. Exchange mapping takes priority so
 * a non-US listing (e.g. Rheinmetall on XETRA) is resolved correctly even when
 * the stored country is imprecise.
 */
export function yahooSymbolFor(
  asset: Pick<Asset, 'symbol' | 'exchange' | 'country'>,
): string | null {
  if (asset.exchange && EXCHANGE_SUFFIX[asset.exchange]) {
    return `${asset.symbol}${EXCHANGE_SUFFIX[asset.exchange]}`
  }
  if (asset.country === 'US') return asset.symbol
  return null
}

type ChartResult = z.infer<typeof yahooSchema>['chart']['result']

interface YahooHistoricalPriceProviderOptions {
  readonly baseUrl?: string
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
}

/**
 * Free quotes/history from Yahoo Finance (no API key). Used for near real-time
 * holding prices, live FX and performance backfill. Failures are non-fatal.
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
    const result = await this.fetchChart(
      `${symbol}?period1=${from}&period2=${to}&interval=1d`,
    )
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

  /** Latest price, used for live FX. */
  async getLatestPrice(symbol: string): Promise<number | null> {
    const quote = await this.getLatestQuote(symbol)
    return quote?.price ?? null
  }

  /**
   * Latest price + previous close. Tries intraday first (near real-time) and
   * falls back to the last daily closes for exchanges without intraday data.
   */
  async getLatestQuote(
    symbol: string,
  ): Promise<{ price: number; previousClose: number } | null> {
    const intraday = await this.fetchChart(`${symbol}?range=1d&interval=1m`)
    const intradayPrice = intraday?.meta?.regularMarketPrice
    if (intradayPrice != null && intradayPrice > 0) {
      return {
        price: intradayPrice,
        previousClose:
          intraday?.meta?.previousClose ?? intraday?.meta?.chartPreviousClose ?? intradayPrice,
      }
    }

    const daily = await this.fetchChart(`${symbol}?range=1mo&interval=1d`)
    const closes = (daily?.indicators.quote[0]?.close ?? []).filter(
      (value): value is number => value != null && value > 0,
    )
    if (closes.length === 0) return null
    const price = closes[closes.length - 1] as number
    const previousClose = closes.length > 1 ? (closes[closes.length - 2] as number) : price
    return { price, previousClose }
  }

  private async fetchChart(pathAndQuery: string): Promise<ChartResult[number] | undefined> {
    const response = await this.fetcher(`${this.baseUrl}/${pathAndQuery}`, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; MarketFlow/1.0)',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!response.ok) return undefined

    const parsed = yahooSchema.safeParse(await response.json())
    return parsed.success ? parsed.data.chart.result?.[0] : undefined
  }
}
