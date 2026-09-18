import type { Asset } from '../assets/asset'
import type { CurrencyCode } from '../money/currency'
import { type Money, subtractMoney } from '../money/money'
import type { FxResolver } from '../fx/exchange-rate'
import type { Position } from '../portfolio/holdings'
import {
  calculateReturnPercentage,
  calculatePortfolioValuation,
  type PricedPosition,
} from '../portfolio/valuation'

export interface PerformancePoint {
  readonly date: string
  readonly portfolioValue: Money
  readonly investedCapital: Money
}

export interface PerformancePointMetrics {
  readonly absoluteReturn: Money
  readonly returnPercentage: number
}

export function calculatePerformancePointMetrics(
  point: PerformancePoint,
): PerformancePointMetrics {
  return {
    absoluteReturn: subtractMoney(point.portfolioValue, point.investedCapital),
    returnPercentage: calculateReturnPercentage(point.investedCapital, point.portfolioValue),
  }
}

export interface PositionPerformance {
  readonly asset: Asset
  readonly returnPercentage: number
  readonly absoluteReturn: Money
  readonly marketValue: Money
}

export function calculatePositionPerformance(priced: PricedPosition): PositionPerformance {
  return {
    asset: priced.position.asset,
    returnPercentage: calculateReturnPercentage(priced.cost, priced.marketValue),
    absoluteReturn: subtractMoney(priced.marketValue, priced.cost),
    marketValue: priced.marketValue,
  }
}

export interface BestWorstPerformers {
  readonly best: PositionPerformance | null
  readonly worst: PositionPerformance | null
}

export function findBestAndWorstPerformers(
  positions: readonly Position[],
  baseCurrency: CurrencyCode,
  fx: FxResolver,
  asOf?: string,
): BestWorstPerformers {
  const valuation = calculatePortfolioValuation(positions, baseCurrency, fx, asOf)
  const performances = valuation.positions
    .filter((entry) => entry.hasPrice && entry.hasCost && entry.cost.minorUnits !== 0)
    .map(calculatePositionPerformance)

  if (performances.length === 0) {
    return { best: null, worst: null }
  }

  const sorted = [...performances].sort(
    (a, b) => b.returnPercentage - a.returnPercentage,
  )
  return {
    best: sorted[0] ?? null,
    worst: sorted[sorted.length - 1] ?? null,
  }
}
