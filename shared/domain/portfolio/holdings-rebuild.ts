import { CurrencyMismatchError } from '../errors'
import type { CurrencyCode } from '../money/currency'
import {
  type Money,
  addMoney,
  divideMoney,
  multiplyMoney,
  subtractMoney,
  zero,
} from '../money/money'
import type { Transaction } from '../transactions/transaction'

/**
 * Per-asset projection derived purely by replaying transactions with the
 * moving-average cost method. Holdings in the database are a cache of this.
 */
export interface HoldingProjection {
  readonly assetId: string
  readonly quantity: number
  readonly totalCost: Money
  readonly averageCostPerShare: Money | null
  readonly realizedGains: Money
  readonly currency: CurrencyCode
}

export interface PortfolioProjection {
  readonly holdings: readonly HoldingProjection[]
  /** Realized gains grouped by currency (one entry per currency). */
  readonly realizedGains: readonly Money[]
}

function sortByDate(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.transactionDate === b.transactionDate) {
      return a.createdAt.localeCompare(b.createdAt)
    }
    return a.transactionDate.localeCompare(b.transactionDate)
  })
}

function projectAsset(assetId: string, transactions: readonly Transaction[]): HoldingProjection {
  const currency = transactions[0]?.price.currency
  if (!currency) {
    return {
      assetId,
      quantity: 0,
      totalCost: zero('EUR'),
      averageCostPerShare: null,
      realizedGains: zero('EUR'),
      currency: 'EUR',
    }
  }

  let quantity = 0
  let totalCost = zero(currency)
  let realizedGains = zero(currency)

  for (const transaction of sortByDate(transactions)) {
    if (
      transaction.price.currency !== currency ||
      transaction.fees.currency !== currency ||
      transaction.taxes.currency !== currency
    ) {
      throw new CurrencyMismatchError(currency, transaction.price.currency)
    }

    if (transaction.transactionType === 'BUY' || transaction.transactionType === 'TRANSFER_IN') {
      const acquisition = addMoney(
        multiplyMoney(transaction.price, transaction.quantity),
        addMoney(transaction.fees, transaction.taxes),
      )
      totalCost = addMoney(totalCost, acquisition)
      quantity += transaction.quantity
      continue
    }

    if (transaction.transactionType === 'SELL' || transaction.transactionType === 'TRANSFER_OUT') {
      const sellQuantity = Math.abs(transaction.quantity)
      const average = quantity > 0 ? divideMoney(totalCost, quantity) : zero(currency)
      const costRemoved = multiplyMoney(average, sellQuantity)
      const proceeds = subtractMoney(
        multiplyMoney(transaction.price, sellQuantity),
        addMoney(transaction.fees, transaction.taxes),
      )
      realizedGains = addMoney(realizedGains, subtractMoney(proceeds, costRemoved))
      totalCost = subtractMoney(totalCost, costRemoved)
      quantity -= sellQuantity
      if (quantity <= 0) {
        quantity = 0
        totalCost = zero(currency)
      }
    }
    // SPLIT and cash movements do not affect the cost basis here.
  }

  return {
    assetId,
    quantity,
    totalCost,
    averageCostPerShare: quantity > 0 ? divideMoney(totalCost, quantity) : null,
    realizedGains,
    currency,
  }
}

/**
 * Replays transactions into holdings. Transactions are the source of truth;
 * `portfolio_holdings` must always be reconstructable from this.
 */
export function projectPortfolio(transactions: readonly Transaction[]): PortfolioProjection {
  const byAsset = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    if (!transaction.assetId) continue
    const group = byAsset.get(transaction.assetId) ?? []
    group.push(transaction)
    byAsset.set(transaction.assetId, group)
  }

  const holdings = [...byAsset.entries()].map(([assetId, group]) =>
    projectAsset(assetId, group),
  )

  const realizedByCurrency = new Map<CurrencyCode, Money>()
  for (const holding of holdings) {
    if (holding.realizedGains.minorUnits === 0) continue
    const current = realizedByCurrency.get(holding.currency) ?? zero(holding.currency)
    realizedByCurrency.set(holding.currency, addMoney(current, holding.realizedGains))
  }

  return { holdings, realizedGains: [...realizedByCurrency.values()] }
}
