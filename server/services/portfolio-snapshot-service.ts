import type { Portfolio } from '../../shared/domain'
import { calculatePortfolioValuation } from '../../shared/domain'
import { toDateKey } from '../../shared/utils/date'
import type { SnapshotRepository } from '../repositories/snapshot-repository'
import type { PortfolioService } from './portfolio-service'

/**
 * Captures a daily snapshot of a portfolio's value so historical charts do not
 * need to recompute the whole portfolio. Forward-only: historical market prices
 * are not available from the current provider, so the curve builds over time.
 */
export class PortfolioSnapshotService {
  constructor(
    private readonly portfolios: PortfolioService,
    private readonly snapshots: SnapshotRepository,
  ) {}

  async capture(portfolio: Portfolio): Promise<void> {
    const context = await this.portfolios.buildContext(portfolio)
    const valuation = calculatePortfolioValuation(
      context.positions,
      portfolio.baseCurrency,
      context.fx,
    )
    await this.snapshots.upsert({
      portfolioId: portfolio.id,
      snapshotDate: toDateKey(new Date()),
      marketValueMinor: valuation.marketValue.minorUnits,
      investedCapitalMinor: valuation.investedCapital.minorUnits,
      cashValueMinor: 0,
      incomeMinor: 0,
      baseCurrency: portfolio.baseCurrency,
    })
  }
}
