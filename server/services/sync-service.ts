import type { Money } from '../../shared/domain'
import type { PortfolioRepository } from '../repositories/portfolio-repository'
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
 * Rebuilds holdings from transactions and refreshes live market prices. Used by
 * the on-demand sync endpoint and the scheduled cron trigger.
 */
export class SyncService {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly holdings: HoldingsService,
    private readonly priceRefresh: PriceRefreshService,
  ) {}

  async syncPortfolio(portfolioId: string): Promise<PortfolioSyncResult> {
    const rebuild = await this.holdings.rebuild(portfolioId)
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
    const prices = await this.priceRefresh.refreshTrackedAssets()
    return { portfolios: portfolios.length, prices }
  }
}
