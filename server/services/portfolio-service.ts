import { ForbiddenError, NotFoundError } from '../../shared/domain/errors'
import type { Portfolio, Position } from '../../shared/domain'
import { money } from '../../shared/domain/money/money'
import type { AssetRepository } from '../repositories/asset-repository'
import type { HoldingRepository } from '../repositories/holding-repository'
import type { PortfolioRepository } from '../repositories/portfolio-repository'
import type { PriceRepository } from '../repositories/price-repository'
import type { CurrencyConversionService } from './currency-conversion-service'
import type { PortfolioContext } from './portfolio-context'

export class PortfolioService {
  constructor(
    private readonly portfolios: PortfolioRepository,
    private readonly holdings: HoldingRepository,
    private readonly assets: AssetRepository,
    private readonly prices: PriceRepository,
    private readonly conversion: CurrencyConversionService,
  ) {}

  async list(userId: string): Promise<Portfolio[]> {
    return this.portfolios.listByUser(userId)
  }

  /**
   * Resolves and authorizes a portfolio. Ownership is enforced here so no route
   * can ever read another user's data by guessing an id.
   */
  async requireOwned(userId: string, portfolioId?: string): Promise<Portfolio> {
    const portfolio = portfolioId
      ? await this.portfolios.findById(portfolioId)
      : await this.portfolios.findDefaultForUser(userId)

    if (!portfolio) {
      throw portfolioId
        ? new NotFoundError('Portfolio', portfolioId)
        : new NotFoundError('Portfolio')
    }
    if (portfolio.userId !== userId) {
      throw new ForbiddenError()
    }
    return portfolio
  }

  /**
   * Loads positions, latest/previous prices and FX in parallel. This is the only
   * place holdings are joined with asset metadata and market data.
   */
  async loadContext(userId: string, portfolioId?: string): Promise<PortfolioContext> {
    const portfolio = await this.requireOwned(userId, portfolioId)
    return this.buildContext(portfolio)
  }

  /**
   * Builds the valuation context for an already-authorized portfolio. Used by
   * the dashboard and by background jobs (snapshots, cron) that operate
   * outside a user request.
   */
  async buildContext(portfolio: Portfolio): Promise<PortfolioContext> {
    const holdings = await this.holdings.listByPortfolio(portfolio.id)
    const assetIds = [...new Set(holdings.map((holding) => holding.assetId))]

    const [assetMap, prices, fx] = await Promise.all([
      this.assets.findManyByIds(assetIds),
      this.prices.latestAndPrevious(assetIds),
      this.conversion.getResolver(),
    ])

    const positions: Position[] = []
    for (const holding of holdings) {
      const asset = assetMap.get(holding.assetId)
      // Asset deleted while a holding still exists: skip rather than crash.
      if (!asset) continue
      const pair = prices.get(holding.assetId)
      positions.push({
        asset,
        quantity: holding.quantity,
        averageCostPerShare: money(holding.averageCostMinor, holding.currency),
        totalCost: money(holding.totalCostMinor, holding.currency),
        lastPrice: pair?.latest?.price ?? null,
        priceDate: pair?.latest?.priceDate ?? null,
      })
    }

    return { portfolio, positions, prices, fx }
  }
}
