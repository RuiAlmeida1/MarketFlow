import type {
  PerformancePeriod,
  PerformancePointDto,
  PerformanceSeriesDto,
} from '../../shared/api/contracts'
import { PERFORMANCE_PERIODS } from '../../shared/api/contracts'
import type { CurrencyCode } from '../../shared/domain'
import { calculatePortfolioValuation, calculateValueChange } from '../../shared/domain'
import { zero } from '../../shared/domain/money/money'
import { addDays, addMonths, addYears, startOfYear, toDateKey } from '../../shared/utils/date'
import type { SnapshotRepository } from '../repositories/snapshot-repository'
import type { PortfolioContext } from './portfolio-context'

export function isPerformancePeriod(value: unknown): value is PerformancePeriod {
  return (
    typeof value === 'string' && (PERFORMANCE_PERIODS as readonly string[]).includes(value)
  )
}

export class PerformanceService {
  constructor(private readonly snapshots: SnapshotRepository) {}

  async buildSeries(
    context: PortfolioContext,
    period: PerformancePeriod,
    today: Date = new Date(),
  ): Promise<PerformanceSeriesDto> {
    const { portfolio, positions, fx } = context
    const baseCurrency = portfolio.baseCurrency
    const valuation = calculatePortfolioValuation(positions, baseCurrency, fx)
    const livePoint: PerformancePointDto = {
      date: toDateKey(today),
      portfolioValue: valuation.marketValue,
      investedCapital: valuation.investedCapital,
    }

    if (period === '1D') {
      const previousPositions = positions.map((position) => ({
        ...position,
        lastPrice:
          context.prices.get(position.asset.id)?.previous?.price ?? position.lastPrice,
      }))
      const previousValuation = calculatePortfolioValuation(
        previousPositions,
        baseCurrency,
        fx,
      )
      return this.assemble(
        period,
        [
          {
            date: toDateKey(addDays(today, -1)),
            portfolioValue: previousValuation.marketValue,
            investedCapital: valuation.investedCapital,
          },
          livePoint,
        ],
        baseCurrency,
      )
    }

    const snapshots = await this.snapshots.listByPortfolio(portfolio.id)
    const cutoff = this.cutoff(period, today)
    const points: PerformancePointDto[] = snapshots
      .filter((snapshot) => !cutoff || snapshot.snapshotDate >= toDateKey(cutoff))
      .map((snapshot) => ({
        date: snapshot.snapshotDate,
        portfolioValue: snapshot.marketValue,
        investedCapital: snapshot.investedCapital,
      }))
    points.push(livePoint)

    return this.assemble(period, points, baseCurrency)
  }

  private cutoff(period: PerformancePeriod, today: Date): Date | null {
    switch (period) {
      case '1W':
        return addDays(today, -7)
      case '1M':
        return addMonths(today, -1)
      case '3M':
        return addMonths(today, -3)
      case 'YTD':
        return startOfYear(today)
      case '1Y':
        return addYears(today, -1)
      default:
        return null
    }
  }

  private assemble(
    period: PerformancePeriod,
    points: PerformancePointDto[],
    baseCurrency: CurrencyCode,
  ): PerformanceSeriesDto {
    const first = points[0]
    const last = points[points.length - 1]
    const change =
      first && last
        ? calculateValueChange(last.portfolioValue, first.portfolioValue)
        : { absolute: zero(baseCurrency), percentage: 0 }
    return { period, points, change }
  }
}
