import type { Money } from '../../shared/domain'
import type { PortfolioRepository } from '../repositories/portfolio-repository'
import type { PriceRepository } from '../repositories/price-repository'
import type { AssetEnrichmentService } from './asset-enrichment-service'
import type { FxRateRefreshService } from './fx-rate-refresh-service'
import type { HoldingsService } from './holdings-service'
import type { PriceRefreshService, PriceRefreshSummary } from './price-refresh-service'

export interface PortfolioSyncResult {
  readonly portfolioId: string
  readonly positions: number
  readonly realizedGains: readonly Money[]
  readonly prices: PriceRefreshSummary
}

export interface GlobalSyncResult {
  readonly portfolios: number
  readonly prices: PriceRefreshSummary
}

export interface StaleRefreshResult {
  readonly refreshed: boolean
  readonly prices?: PriceRefreshSummary
}

const DEFAULT_STALE_MS = 60_000

/**
 * Rebuilds holdings from transactions and refreshes FX + live market prices.
 * Used by the on-demand sync endpoint, the scheduled cron trigger and the
 * dashboard's background revalidation.
 */
export class SyncService {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly holdings: HoldingsService,
    private readonly priceRefresh: PriceRefreshService,
    private readonly fxRefresh: FxRateRefreshService,
    private readonly prices: PriceRepository,
    private readonly enrichment: AssetEnrichmentService,
  ) {}

  private async refreshRates(): Promise<void> {
    try {
      await this.fxRefresh.refresh()
    } catch (error) {
      console.warn('[sync] FX refresh failed', error)
    }
  }

  private async enrichAssets(): Promise<void> {
    try {
      await this.enrichment.enrichTrackedAssets()
    } catch (error) {
      console.warn('[sync] asset enrichment failed', error)
    }
  }

  /**
   * Refreshes prices only when the newest quote is older than `maxAgeMs`.
   * Called on dashboard reads so the UI stays near-live without hammering the
   * provider.
   */
  async refreshPricesIfStale(maxAgeMs: number = DEFAULT_STALE_MS): Promise<StaleRefreshResult> {
    const latest = await this.prices.latestSourceTimestamp('finnhub')
    if (latest && Date.now() - Date.parse(latest) < maxAgeMs) {
      return { refreshed: false }
    }
    const prices = await this.priceRefresh.refreshTrackedAssets()
    return { refreshed: true, prices }
  }

  async syncPortfolio(portfolioId: string): Promise<PortfolioSyncResult> {
    const rebuild = await this.holdings.rebuild(portfolioId)
    await this.refreshRates()
    await this.enrichAssets()
    const prices = await this.priceRefresh.refreshTrackedAssets()
    return {
      portfolioId,
      positions: rebuild.positions,
      realizedGains: rebuild.realizedGains,
      prices,
    }
  }

  async syncAll(): Promise<GlobalSyncResult> {
    const portfolios = await this.portfolios.listAll()
    for (const portfolio of portfolios) {
      await this.holdings.rebuild(portfolio.id)
    }
    await this.refreshRates()
    await this.enrichAssets()
    const prices = await this.priceRefresh.refreshTrackedAssets()
    return { portfolios: portfolios.length, prices }
  }
}
