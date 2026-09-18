import type { Asset, SymbolQuoteProvider } from '../../shared/domain'
import { fromMajor } from '../../shared/domain/money/money'
import { addDays, toDateKey } from '../../shared/utils/date'
import type { AssetRepository } from '../repositories/asset-repository'
import type { HoldingRepository } from '../repositories/holding-repository'
import type { PriceRepository } from '../repositories/price-repository'

export interface PriceRefreshSummary {
  readonly updated: number
  readonly skipped: number
  readonly failed: number
}

const SUPPORTED_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'NYSEARCA', 'AMEX', 'BATS'])
const QUOTABLE_ASSET_TYPES = new Set(['STOCK', 'ETF', 'REIT'])
const CURRENT_SOURCE = 'finnhub'
const PREVIOUS_SOURCE = 'finnhub-prev'
/** Previous close is stored one minute before "now" so it ranks as the prior row. */
const PREVIOUS_OFFSET_MS = 60_000

/**
 * The Finnhub free plan only covers US equities/ETFs. Non-US or unsupported
 * instruments are skipped rather than attempted.
 */
export function isQuoteSupported(
  asset: Pick<Asset, 'assetType' | 'exchange' | 'country'>,
): boolean {
  if (!QUOTABLE_ASSET_TYPES.has(asset.assetType)) return false
  if (asset.country === 'US') return true
  return asset.exchange != null && SUPPORTED_EXCHANGES.has(asset.exchange)
}

export interface LatestQuoteProvider {
  getLatestQuote(symbol: string): Promise<{ price: number; previousClose: number } | null>
}

/**
 * Fetches live quotes for every tracked asset and upserts them into
 * `asset_prices`. Prefers a near-real-time provider (Yahoo) and falls back to
 * the configured quote provider (Finnhub). No provider means a no-op.
 */
export class PriceRefreshService {
  constructor(
    private readonly provider: SymbolQuoteProvider | null,
    private readonly assets: AssetRepository,
    private readonly holdings: HoldingRepository,
    private readonly prices: PriceRepository,
    private readonly liveQuotes: LatestQuoteProvider | null = null,
  ) {}

  async refreshTrackedAssets(): Promise<PriceRefreshSummary> {
    if (!this.provider) return { updated: 0, skipped: 0, failed: 0 }

    const assetIds = await this.holdings.listDistinctAssetIds()
    if (assetIds.length === 0) return { updated: 0, skipped: 0, failed: 0 }

    const assetMap = await this.assets.findManyByIds(assetIds)
    const now = new Date()
    const priceDate = toDateKey(now)
    const timestamp = now.toISOString()
    const previousDate = toDateKey(addDays(now, -1))
    const previousTimestamp = new Date(now.getTime() - PREVIOUS_OFFSET_MS).toISOString()

    let updated = 0
    let skipped = 0
    let failed = 0

    for (const asset of assetMap.values()) {
      if (!isQuoteSupported(asset)) {
        skipped += 1
        continue
      }
      try {
        const quote = await this.resolveQuote(asset.symbol)
        if (!quote || quote.price <= 0) {
          skipped += 1
          continue
        }
        await this.prices.upsertPrice({
          assetId: asset.id,
          price: fromMajor(quote.price, asset.currency),
          priceDate,
          timestamp,
          source: CURRENT_SOURCE,
        })
        // Store the previous close so daily change is computed against a real
        // prior price rather than stale/incomplete history.
        if (quote.previousClose > 0) {
          await this.prices.upsertPrice({
            assetId: asset.id,
            price: fromMajor(quote.previousClose, asset.currency),
            priceDate: previousDate,
            timestamp: previousTimestamp,
            source: PREVIOUS_SOURCE,
          })
        }
        updated += 1
      } catch (error) {
        failed += 1
        console.warn('[price-refresh] quote failed', { symbol: asset.symbol, error })
      }
    }

    return { updated, skipped, failed }
  }

  private async resolveQuote(
    symbol: string,
  ): Promise<{ price: number; previousClose: number } | null> {
    if (this.liveQuotes) {
      try {
        const live = await this.liveQuotes.getLatestQuote(symbol)
        if (live && live.price > 0) return live
      } catch (error) {
        console.warn('[price-refresh] live quote failed, falling back', { symbol, error })
      }
    }
    if (this.provider) {
      const quote = await this.provider.getSymbolQuote(symbol)
      if (quote && quote.price > 0) {
        return { price: quote.price, previousClose: quote.previousClose }
      }
    }
    return null
  }
}
