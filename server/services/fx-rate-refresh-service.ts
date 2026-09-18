import { z } from 'zod'
import type { CurrencyCode } from '../../shared/domain'
import { isCurrencyCode } from '../../shared/domain'
import { ExternalServiceError } from '../../shared/domain/errors'
import { toDateKey } from '../../shared/utils/date'
import type { FxRateWrite } from '../repositories/fx-rate-repository'

const frankfurterSchema = z.object({
  base: z.string(),
  date: z.string(),
  rates: z.record(z.string(), z.number()),
})

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest'
const TIMEOUT_MS = 8_000

export interface FxRateWriter {
  upsertRate(input: FxRateWrite): Promise<void>
}

/** Synchronous-ish latest price source used for intraday FX. */
export interface LatestPriceProvider {
  getLatestPrice(symbol: string): Promise<number | null>
}

export interface FxRefreshResult {
  readonly updated: number
}

/**
 * Refreshes FX rates from Frankfurter (ECB reference rates, no API key) and
 * overlays live EUR/USD from Yahoo so intraday moves are reflected. Stores both
 * directions so a stale direct pair can never win over a fresh inverse.
 */
export class FxRateRefreshService {
  constructor(
    private readonly rates: FxRateWriter,
    private readonly baseCurrency: CurrencyCode = 'EUR',
    private readonly fetcher: typeof fetch = (input, init) =>
      globalThis.fetch(input, init),
    private readonly latest: LatestPriceProvider | null = null,
  ) {}

  async refresh(): Promise<FxRefreshResult> {
    const url = `${FRANKFURTER_URL}?from=${this.baseCurrency}`
    const response = await this.fetcher(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new ExternalServiceError(
        `FX provider responded with status ${response.status}.`,
      )
    }

    const payload = frankfurterSchema.safeParse(await response.json())
    if (!payload.success) {
      throw new ExternalServiceError('FX provider returned an unexpected payload.')
    }

    const timestamp = new Date().toISOString()
    let updated = 0

    for (const [quote, rate] of Object.entries(payload.data.rates)) {
      if (!isCurrencyCode(quote) || quote === this.baseCurrency || rate <= 0) continue
      const pair = { base: this.baseCurrency, quote, rate, rateDate: payload.data.date, timestamp, source: 'frankfurter' }
      await this.rates.upsertRate(pair)
      await this.rates.upsertRate({
        base: quote,
        quote: this.baseCurrency,
        rate: 1 / rate,
        rateDate: payload.data.date,
        timestamp,
        source: 'frankfurter',
      })
      updated += 1
    }

    await this.overlayLiveRate()

    return { updated }
  }

  /**
   * Overlays the live EUR/USD rate (Yahoo) for today so intraday FX is not
   * stuck at the daily ECB fixing.
   */
  private async overlayLiveRate(): Promise<void> {
    if (!this.latest) return
    const eurUsd = await this.latest.getLatestPrice('EURUSD=X')
    if (eurUsd == null || eurUsd <= 0) return

    const rateDate = toDateKey(new Date())
    const timestamp = new Date(Date.now() + 1).toISOString()
    await this.rates.upsertRate({
      base: 'EUR',
      quote: 'USD',
      rate: eurUsd,
      rateDate,
      timestamp,
      source: 'yahoo',
    })
    await this.rates.upsertRate({
      base: 'USD',
      quote: 'EUR',
      rate: 1 / eurUsd,
      rateDate,
      timestamp,
      source: 'yahoo',
    })
  }
}

