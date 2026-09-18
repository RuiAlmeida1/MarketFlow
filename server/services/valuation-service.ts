import type { HoldingDto, PortfolioSummaryDto } from '../../shared/api/contracts'
import type {
  AllocationDimension,
  AllocationSlice,
  CurrencyCode,
  Money,
  Position,
} from '../../shared/domain'
import {
  calculateAllocation,
  calculatePortfolioValuation,
  calculatePortfolioYield,
  calculatePositionWeight,
  calculateReturnPercentage,
  calculateValueChange,
  subtractMoney,
} from '../../shared/domain'
import { convertWithResolver } from '../../shared/domain/fx/convert'
import type { FxResolver } from '../../shared/domain/fx/exchange-rate'
import { addMoney, fromMajor, zero } from '../../shared/domain/money/money'
import type { PortfolioContext } from './portfolio-context'

/**
 * Cash is stored as a quantity of major units in its own currency (a CASH
 * asset has no meaningful "price per share"), so it is converted directly.
 */
function calculateCashValue(
  positions: readonly Position[],
  baseCurrency: CurrencyCode,
  fx: FxResolver,
): Money {
  let total = zero(baseCurrency)
  for (const position of positions) {
    if (position.asset.assetType !== 'CASH') continue
    const amount = fromMajor(position.quantity, position.asset.currency)
    total = addMoney(total, convertWithResolver(amount, baseCurrency, fx).value)
  }
  return total
}

export function buildPortfolioSummary(
  context: PortfolioContext,
  annualDividendIncome: Money,
): PortfolioSummaryDto {
  const { portfolio, positions, fx, prices } = context
  const baseCurrency = portfolio.baseCurrency
  const valuation = calculatePortfolioValuation(positions, baseCurrency, fx)

  const previousPositions = positions.map((position) => {
    const pair = prices.get(position.asset.id)
    const previousPrice = pair?.previous?.price ?? position.lastPrice
    return { ...position, lastPrice: previousPrice }
  })
  const previousValuation = calculatePortfolioValuation(
    previousPositions,
    baseCurrency,
    fx,
  )

  return {
    baseCurrency,
    marketValue: valuation.marketValue,
    investedCapital: valuation.investedCapital,
    unrealizedReturn: valuation.unrealizedReturn,
    unrealizedReturnPercentage: valuation.unrealizedReturnPercentage,
    dailyChange: calculateValueChange(
      valuation.marketValue,
      previousValuation.marketValue,
    ),
    cashValue: calculateCashValue(positions, baseCurrency, fx),
    annualDividendIncome,
    portfolioYield: calculatePortfolioYield(
      annualDividendIncome,
      valuation.marketValue,
    ),
  }
}

export function buildHoldings(context: PortfolioContext): HoldingDto[] {
  const { portfolio, positions, fx } = context
  const valuation = calculatePortfolioValuation(positions, portfolio.baseCurrency, fx)

  return valuation.positions.map((priced) => {
    const hasPrice = priced.position.lastPrice !== null
    return {
      asset: priced.position.asset,
      quantity: priced.position.quantity,
      averageCostPerShare: priced.position.averageCostPerShare,
      totalCost: priced.position.totalCost,
      lastPrice: priced.position.lastPrice,
      marketValue: priced.marketValue,
      cost: priced.cost,
      // Without a price, a return percentage would be meaningless (not -100%).
      absoluteReturn: hasPrice
        ? subtractMoney(priced.marketValue, priced.cost)
        : zero(priced.cost.currency),
      returnPercentage: hasPrice
        ? calculateReturnPercentage(priced.cost, priced.marketValue)
        : 0,
      weight: calculatePositionWeight(priced.marketValue, valuation.marketValue),
    }
  })
}

export function buildAllocation(
  context: PortfolioContext,
  dimension: AllocationDimension,
): AllocationSlice[] {
  return calculateAllocation(
    context.positions,
    context.portfolio.baseCurrency,
    context.fx,
    dimension,
  )
}
