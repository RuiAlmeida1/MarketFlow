import { CurrencyMismatchError } from '../errors'
import type { CurrencyCode } from '../money/currency'
import {
  type Money,
  addMoney,
  money,
  multiplyMoney,
  roundHalfAwayFromZero,
  zero,
} from '../money/money'
import type { Transaction } from '../transactions/transaction'

/**
 * Per-asset projection derived purely by replaying transactions with the FIFO
 * (lot) method, which matches how brokers such as XTB report open positions.
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

/** Quantities below this are floating-point noise from repeated arithmetic. */
const QUANTITY_EPSILON = 1e-9

function sortByDate(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.transactionDate === b.transactionDate) {
      return a.createdAt.localeCompare(b.createdAt)
    }
    return a.transactionDate.localeCompare(b.transactionDate)
  })
}

/**
 * Only these types affect the cost basis / quantity. Cash events (dividends,
 * taxes, fees, deposits, ...) are ignored here so their settlement currency
 * never mixes with the instrument currency.
 */
const POSITION_TYPES = new Set(['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'SPLIT'])

export function isPositionTransaction(transactionType: string): boolean {
  return POSITION_TYPES.has(transactionType)
}

interface Lot {
  quantity: number
  /** Remaining cost of this lot in minor units (asset currency). */
  costMinor: number
}

function emptyProjection(assetId: string): HoldingProjection {
  return {
    assetId,
    quantity: 0,
    totalCost: zero('EUR'),
    averageCostPerShare: null,
    realizedGains: zero('EUR'),
    currency: 'EUR',
  }
}

function projectAsset(
  assetId: string,
  transactions: readonly Transaction[],
): HoldingProjection {
  const currency = transactions[0]?.price.currency
  if (!currency) return emptyProjection(assetId)

  const lots: Lot[] = []
  let realized = zero(currency)

  for (const transaction of sortByDate(transactions)) {
    if (
      transaction.price.currency !== currency ||
      transaction.fees.currency !== currency ||
      transaction.taxes.currency !== currency
    ) {
      throw new CurrencyMismatchError(currency, transaction.price.currency)
    }

    if (transaction.transactionType === 'BUY' || transaction.transactionType === 'TRANSFER_IN') {
      const lotCost = addMoney(
        multiplyMoney(transaction.price, transaction.quantity),
        addMoney(transaction.fees, transaction.taxes),
      )
      lots.push({ quantity: transaction.quantity, costMinor: lotCost.minorUnits })
      continue
    }

    if (transaction.transactionType === 'SELL' || transaction.transactionType === 'TRANSFER_OUT') {
      let remaining = Math.abs(transaction.quantity)
      if (remaining <= QUANTITY_EPSILON) continue

      const proceedsMinor = multiplyMoney(transaction.price, remaining).minorUnits
      const sellFeesMinor = addMoney(transaction.fees, transaction.taxes).minorUnits
      let costRemoved = 0

      // FIFO: consume the oldest lots first.
      while (remaining > QUANTITY_EPSILON && lots.length > 0) {
        const lot = lots[0]
        if (!lot) break
        const consumed = Math.min(lot.quantity, remaining)
        const share = consumed / lot.quantity
        const removed = roundHalfAwayFromZero(lot.costMinor * share)
        lot.costMinor -= removed
        costRemoved += removed
        lot.quantity -= consumed
        remaining -= consumed
        if (lot.quantity <= QUANTITY_EPSILON) lots.shift()
      }

      const gain = proceedsMinor - sellFeesMinor - costRemoved
      realized = addMoney(realized, money(gain, currency))
    }
    // SPLIT is handled at import time.
  }

  let quantity = 0
  let totalCostMinor = 0
  for (const lot of lots) {
    quantity += lot.quantity
    totalCostMinor += lot.costMinor
  }
  const normalizedQuantity = Math.abs(quantity) < QUANTITY_EPSILON ? 0 : quantity

  return {
    assetId,
    quantity: normalizedQuantity,
    totalCost: normalizedQuantity === 0 ? zero(currency) : money(totalCostMinor, currency),
    averageCostPerShare:
      normalizedQuantity > 0
        ? money(roundHalfAwayFromZero(totalCostMinor / normalizedQuantity), currency)
        : null,
    realizedGains: realized,
    currency,
  }
}

/**
 * Replays transactions into holdings using FIFO lots. Transactions are the
 * source of truth; `portfolio_holdings` must always be reconstructable.
 */
export function projectPortfolio(transactions: readonly Transaction[]): PortfolioProjection {
  const byAsset = new Map<string, Transaction[]>()
  for (const transaction of transactions) {
    if (!transaction.assetId) continue
    if (!POSITION_TYPES.has(transaction.transactionType)) continue
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
