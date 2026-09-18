import type {
  DashboardResponse,
  DividendSectionDto,
  IncomeOverviewDto,
  PerformancePeriod,
  PerformanceSeriesDto,
} from '../../shared/api/contracts'
import type {
  AllocationDimension,
  CurrencyCode,
  Money,
  Transaction,
} from '../../shared/domain'
import { sumMoney } from '../../shared/domain'
import { convertWithResolver } from '../../shared/domain/fx/convert'
import type { FxResolver } from '../../shared/domain/fx/exchange-rate'
import { zero } from '../../shared/domain/money/money'
import { todayUtc } from '../../shared/utils/date'
import type { TransactionRepository } from '../repositories/transaction-repository'
import type { DividendService } from './dividend-service'
import type { MarketDataService } from './market-data-service'
import type { PerformanceService } from './performance-service'
import type { PortfolioService } from './portfolio-service'
import {
  buildAllocation,
  buildHoldings,
  buildPortfolioSummary,
} from './valuation-service'
import type { WatchlistService } from './watchlist-service'

export interface DashboardOptions {
  readonly period?: PerformancePeriod
  readonly dimension?: AllocationDimension
}

/**
 * Aggregates the whole dashboard in a single request. Independent reads run in
 * parallel and optional sections degrade to empty values, so a failure in (for
 * example) the market-data provider never takes down a user's portfolio.
 */
export class DashboardService {
  constructor(
    private readonly portfolios: PortfolioService,
    private readonly dividends: DividendService,
    private readonly performance: PerformanceService,
    private readonly watchlists: WatchlistService,
    private readonly markets: MarketDataService,
    private readonly transactions: TransactionRepository,
  ) {}

  async getDashboard(
    userId: string,
    portfolioId?: string,
    options: DashboardOptions = {},
  ): Promise<DashboardResponse> {
    const dimension = options.dimension ?? 'sector'
    const period = options.period ?? '1Y'
    const context = await this.portfolios.loadContext(userId, portfolioId)
    const baseCurrency = context.portfolio.baseCurrency

    const [dividends, transactions, performance, watchlists, markets] = await Promise.all([
      this.degrade(
        this.dividends.buildSection(context.portfolio, context.fx),
        this.emptyDividendSection(baseCurrency),
        'dividends',
      ),
      this.degrade(
        this.transactions.listByPortfolio(context.portfolio.id, 200),
        [] as Transaction[],
        'transactions',
      ),
      this.degrade(
        this.performance.buildSeries(context, period),
        this.emptyPerformance(period, baseCurrency),
        'performance',
      ),
      this.degrade(this.watchlists.listByUser(userId), [], 'watchlists'),
      this.degrade(
        this.markets.getOverview(),
        { asOf: new Date().toISOString(), quotes: [] },
        'markets',
      ),
    ])

    const summary = buildPortfolioSummary(context, dividends.annualIncome)
    const holdings = buildHoldings(context)
    const allocation = buildAllocation(context, dimension)
    const defaultWatchlist =
      watchlists.find((list) => list.isDefault) ?? watchlists[0] ?? null

    return {
      portfolio: context.portfolio,
      generatedAt: new Date().toISOString(),
      summary,
      performance,
      allocation: { dimension, slices: allocation },
      holdings,
      dividends,
      watchlist: defaultWatchlist,
      markets: markets.quotes,
      income: this.buildIncome(baseCurrency, dividends.annualIncome, transactions, context.fx),
    }
  }

  /** Resolves a promise, falling back to a safe default and logging failures. */
  private async degrade<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
    try {
      return await promise
    } catch (error) {
      console.error(`[dashboard] optional section "${label}" failed`, error)
      return fallback
    }
  }

  private emptyDividendSection(baseCurrency: CurrencyCode): DividendSectionDto {
    const year = todayUtc().getUTCFullYear()
    return {
      year,
      monthly: Array.from({ length: 12 }, (_, month) => ({
        month,
        received: zero(baseCurrency),
        projected: zero(baseCurrency),
        total: zero(baseCurrency),
      })),
      annualIncome: zero(baseCurrency),
      receivedIncome: zero(baseCurrency),
      projectedIncome: zero(baseCurrency),
      upcoming: [],
    }
  }

  private emptyPerformance(
    period: PerformancePeriod,
    baseCurrency: CurrencyCode,
  ): PerformanceSeriesDto {
    return {
      period,
      points: [],
      change: { absolute: zero(baseCurrency), percentage: 0 },
    }
  }

  private buildIncome(
    baseCurrency: CurrencyCode,
    annualDividends: Money,
    transactions: readonly Transaction[],
    fx: FxResolver,
  ): IncomeOverviewDto {
    const year = todayUtc().getUTCFullYear()
    const interestValues = transactions
      .filter(
        (transaction) =>
          transaction.transactionType === 'INTEREST' &&
          transaction.transactionDate.startsWith(String(year)),
      )
      .map(
        (transaction) =>
          convertWithResolver(transaction.price, baseCurrency, fx, transaction.transactionDate)
            .value,
      )
    const interest = sumMoney(interestValues, baseCurrency)
    // Realized gains need full transaction replay with cost basis (Phase 2).
    const realizedGains = zero(baseCurrency)
    const otherIncome = zero(baseCurrency)
    const total = sumMoney(
      [annualDividends, realizedGains, interest, otherIncome],
      baseCurrency,
    )

    return { dividends: annualDividends, realizedGains, interest, otherIncome, total }
  }
}
