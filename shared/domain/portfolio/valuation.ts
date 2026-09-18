import { CurrencyMismatchError } from '../errors'
import type { TransactionType } from '../transactions/transaction'
import type { CurrencyCode } from '../money/currency'
import {
  type Money,
  addMoney,
  divideMoney,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  zero,
} from '../money/money'
import type { FxResolver } from '../fx/exchange-rate'
import { convertWithResolver } from '../fx/convert'
import type { Position } from './holdings'

export interface PricedPosition {
  readonly position: Position
  readonly marketValue: Money
  readonly cost: Money
  readonly hasPrice: boolean
  readonly hasCost: boolean
  readonly hasFx: boolean
}

export interface PortfolioValuation {
  readonly baseCurrency: CurrencyCode
  readonly marketValue: Money
  readonly investedCapital: Money
  readonly unrealizedReturn: Money
  readonly unrealizedReturnPercentage: number
  readonly pricedPositions: number
  readonly totalPositions: number
  readonly missingPrices: readonly string[]
  readonly missingFx: readonly string[]
  readonly positions: readonly PricedPosition[]
}

export function calculatePositionValue(quantity: number, price: Money): Money {
  return multiplyMoney(price, quantity)
}

export function calculatePositionCost(quantity: number, averageCostPerShare: Money): Money {
  return multiplyMoney(averageCostPerShare, quantity)
}

export function calculateAbsoluteReturn(value: Money, cost: Money): Money {
  return subtractMoney(value, cost)
}

/**
 * Percentage return in points (`12.5` means +12.5%).
 * Returns 0 when the cost basis is zero to avoid a meaningless infinity.
 */
export function calculateReturnPercentage(cost: Money, value: Money): number {
  if (cost.currency !== value.currency) {
    throw new CurrencyMismatchError(cost.currency, value.currency)
  }
  if (cost.minorUnits === 0) return 0
  return ((value.minorUnits - cost.minorUnits) / Math.abs(cost.minorUnits)) * 100
}

export interface ValueChange {
  readonly absolute: Money
  readonly percentage: number
}

export function calculateValueChange(current: Money, previous: Money): ValueChange {
  return {
    absolute: subtractMoney(current, previous),
    percentage: calculateReturnPercentage(previous, current),
  }
}

/** Yield in points: annual income divided by current market value. */
export function calculatePortfolioYield(annualIncome: Money, marketValue: Money): number {
  if (marketValue.currency !== annualIncome.currency) {
    throw new CurrencyMismatchError(marketValue.currency, annualIncome.currency)
  }
  if (marketValue.minorUnits === 0) return 0
  return (annualIncome.minorUnits / Math.abs(marketValue.minorUnits)) * 100
}

export function calculatePositionWeight(positionValue: Money, portfolioValue: Money): number {
  if (positionValue.currency !== portfolioValue.currency) {
    throw new CurrencyMismatchError(positionValue.currency, portfolioValue.currency)
  }
  if (portfolioValue.minorUnits === 0) return 0
  return (positionValue.minorUnits / portfolioValue.minorUnits) * 100
}

export function valuePosition(
  position: Position,
  baseCurrency: CurrencyCode,
  fx: FxResolver,
  asOf?: string,
): PricedPosition {
  const rawMarketValue = position.lastPrice
    ? calculatePositionValue(position.quantity, position.lastPrice)
    : null
  const rawCost =
    position.totalCost ??
    (position.averageCostPerShare
      ? calculatePositionCost(position.quantity, position.averageCostPerShare)
      : null)

  const costConversion = rawCost
    ? convertWithResolver(rawCost, baseCurrency, fx, asOf)
    : { value: zero(baseCurrency), ok: false }

  // When there is no price, value the position at cost so an unpriced asset
  // does not fabricate a loss. `hasPrice` still tells callers it is missing.
  const marketConversion = rawMarketValue
    ? convertWithResolver(rawMarketValue, baseCurrency, fx, asOf)
    : costConversion

  return {
    position,
    marketValue: marketConversion.value,
    cost: costConversion.value,
    hasPrice: rawMarketValue !== null,
    hasCost: rawCost !== null,
    hasFx: rawMarketValue !== null ? marketConversion.ok && costConversion.ok : costConversion.ok,
  }
}

export function calculatePortfolioValuation(
  positions: readonly Position[],
  baseCurrency: CurrencyCode,
  fx: FxResolver,
  asOf?: string,
): PortfolioValuation {
  const priced = positions.map((position) => valuePosition(position, baseCurrency, fx, asOf))
  const marketValue = sumMoney(
    priced.map((entry) => entry.marketValue),
    baseCurrency,
  )
  const investedCapital = sumMoney(
    priced.map((entry) => entry.cost),
    baseCurrency,
  )
  const unrealizedReturn = subtractMoney(marketValue, investedCapital)

  return {
    baseCurrency,
    marketValue,
    investedCapital,
    unrealizedReturn,
    unrealizedReturnPercentage: calculateReturnPercentage(investedCapital, marketValue),
    pricedPositions: priced.filter((entry) => entry.hasPrice).length,
    totalPositions: positions.length,
    missingPrices: priced.filter((entry) => !entry.hasPrice).map((entry) => entry.position.asset.id),
    missingFx: priced.filter((entry) => !entry.hasFx).map((entry) => entry.position.asset.id),
    positions: [...priced].sort((a, b) => b.marketValue.minorUnits - a.marketValue.minorUnits),
  }
}

export interface CostBasisTransaction {
  readonly transactionType: TransactionType
  readonly quantity: number
  readonly price: Money
  readonly fees: Money
  readonly taxes: Money
}

export interface AverageCostResult {
  readonly quantity: number
  readonly totalCost: Money
  readonly averageCostPerShare: Money | null
}

/**
 * Weighted average cost using the moving-average method:
 * acquisitions increase basis (including fees/taxes); disposals remove basis at
 * the running average. SPLIT rows are ignored here because the ratio lives in
 * the transaction metadata handled at import time.
 */
export function calculateAverageCost(
  transactions: readonly CostBasisTransaction[],
  currency: CurrencyCode,
): AverageCostResult {
  let quantity = 0
  let totalCost = zero(currency)

  for (const transaction of transactions) {
    if (
      transaction.price.currency !== currency ||
      transaction.fees.currency !== currency ||
      transaction.taxes.currency !== currency
    ) {
      throw new CurrencyMismatchError(currency, transaction.price.currency)
    }

    if (transaction.transactionType === 'BUY' || transaction.transactionType === 'TRANSFER_IN') {
      const acquisitionCost = addMoney(
        multiplyMoney(transaction.price, transaction.quantity),
        addMoney(transaction.fees, transaction.taxes),
      )
      totalCost = addMoney(totalCost, acquisitionCost)
      quantity += transaction.quantity
      continue
    }

    if (transaction.transactionType === 'SELL' || transaction.transactionType === 'TRANSFER_OUT') {
      const sellQuantity = Math.abs(transaction.quantity)
      if (quantity > 0) {
        const average = divideMoney(totalCost, quantity)
        totalCost = subtractMoney(totalCost, multiplyMoney(average, sellQuantity))
      }
      quantity -= sellQuantity
      if (quantity <= 0) {
        quantity = 0
        totalCost = zero(currency)
      }
    }
  }

  return {
    quantity,
    totalCost,
    averageCostPerShare: quantity > 0 ? divideMoney(totalCost, quantity) : null,
  }
}
