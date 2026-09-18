import type { Money } from '../../shared/domain'
import type { PortfolioRepository } from '../repositories/portfolio-repository'
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

/**
 * Rebuilds holdings from transactions and refreshes FX + live market prices.
 * Used by the on-demand sync endpoint and the scheduled cron trigger.
 */
export class SyncService {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly holdings: HoldingsService,
    private readonly priceRefresh: PriceRefreshService,
    private readonly fxRefresh: FxRateRefreshService,
  ) {}

  private async refreshRates(): Promise<void> {
    try {
      await this.fxRefresh.refresh()
    } catch (error) {
      console.warn('[sync] FX refresh failed', error)
    }
  }

  async syncPortfolio(portfolioId: string): Promise<PortfolioSyncResult> {
    const rebuild = await this.holdings.rebuild(portfolioId)
    await this.refreshRates()
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
    const prices = await this.priceRefresh.refreshTrackedAssets()
    return { portfolios: portfolios.length, prices }
  }
}
