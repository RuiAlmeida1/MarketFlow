import type { Env } from '../env'
import { AssetRepository } from '../repositories/asset-repository'
import { DividendRepository } from '../repositories/dividend-repository'
import { FxRateRepository } from '../repositories/fx-rate-repository'
import { HoldingRepository } from '../repositories/holding-repository'
import { PortfolioRepository } from '../repositories/portfolio-repository'
import { PriceRepository } from '../repositories/price-repository'
import { SnapshotRepository } from '../repositories/snapshot-repository'
import { TransactionRepository } from '../repositories/transaction-repository'
import { UserRepository } from '../repositories/user-repository'
import { WatchlistRepository } from '../repositories/watchlist-repository'
import { CurrencyConversionService } from './currency-conversion-service'
import { DashboardService } from './dashboard-service'
import { DividendService } from './dividend-service'
import { MarketDataService } from './market-data-service'
import { PerformanceService } from './performance-service'
import { PortfolioService } from './portfolio-service'
import { WatchlistService } from './watchlist-service'

export interface Services {
  readonly users: UserRepository
  readonly assets: AssetRepository
  readonly transactions: TransactionRepository
  readonly portfolios: PortfolioService
  readonly dividends: DividendService
  readonly performance: PerformanceService
  readonly watchlists: WatchlistService
  readonly markets: MarketDataService
  readonly conversion: CurrencyConversionService
  readonly dashboard: DashboardService
}

/**
 * Composition root. One container is created per request so memoization (FX
 * snapshot) never leaks across requests.
 */
export function createServices(env: Env): Services {
  const portfolios = new PortfolioRepository(env.DB)
  const holdings = new HoldingRepository(env.DB)
  const assets = new AssetRepository(env.DB)
  const prices = new PriceRepository(env.DB)
  const transactions = new TransactionRepository(env.DB)
  const dividends = new DividendRepository(env.DB)
  const fxRates = new FxRateRepository(env.DB)
  const snapshots = new SnapshotRepository(env.DB)
  const watchlists = new WatchlistRepository(env.DB)
  const users = new UserRepository(env.DB)

  const conversion = new CurrencyConversionService(fxRates)
  const portfolioService = new PortfolioService(
    portfolios,
    holdings,
    assets,
    prices,
    conversion,
  )
  const dividendService = new DividendService(dividends, assets)
  const performanceService = new PerformanceService(snapshots)
  const watchlistService = new WatchlistService(watchlists, assets, prices)
  const marketService = new MarketDataService()
  const dashboardService = new DashboardService(
    portfolioService,
    dividendService,
    performanceService,
    watchlistService,
    marketService,
    transactions,
  )

  return {
    users,
    assets,
    transactions,
    portfolios: portfolioService,
    dividends: dividendService,
    performance: performanceService,
    watchlists: watchlistService,
    markets: marketService,
    conversion,
    dashboard: dashboardService,
  }
}
