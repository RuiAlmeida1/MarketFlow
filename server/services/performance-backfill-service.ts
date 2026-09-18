import type { HistoricalPriceProvider, Portfolio } from '../../shared/domain'
import { projectPortfolio } from '../../shared/domain'
import type { CurrencyCode, Money, Transaction } from '../../shared/domain'
import { convertMoney, fromMajor, multiplyMoney, sumMoney, zero } from '../../shared/domain'
import { toDateKey } from '../../shared/utils/date'
import type { AssetRepository } from '../repositories/asset-repository'
import type { SnapshotRepository } from '../repositories/snapshot-repository'
import type { TransactionRepository } from '../repositories/transaction-repository'
import type { CurrencyConversionService } from './currency-conversion-service'
import { isQuoteSupported } from './price-refresh-service'

const MAX_DAYS = 400
const FX_SYMBOL = 'EURUSD=X'

export interface BackfillResult {
  readonly days: number
}

/**
 * Reconstructs daily portfolio snapshots from historical prices so the
 * performance chart has history from the first transaction. Uses Yahoo daily
 * closes; any missing instrument falls back to its average cost.
 */
export class PerformanceBackfillService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly assets: AssetRepository,
    private readonly snapshots: SnapshotRepository,
    private readonly historical: HistoricalPriceProvider | null,
    private readonly conversion: CurrencyConversionService,
  ) {}

  async backfill(portfolio: Portfolio): Promise<BackfillResult> {
    if (!this.historical) return { days: 0 }

    const transactions = await this.transactions.listByPortfolio(portfolio.id, 10_000)
    const positionTxs = transactions.filter(
      (transaction) => transaction.assetId !== null && isPosition(transaction),
    )
    if (positionTxs.length === 0) return { days: 0 }

    const assetIds = [...new Set(positionTxs.map((t) => t.assetId as string))]
    const assetMap = await this.assets.findManyByIds(assetIds)
    const fromDate = positionTxs.reduce(
      (min, t) => (t.transactionDate < min ? t.transactionDate : min),
      positionTxs[0]?.transactionDate ?? toDateKey(new Date()),
    )
    const toDate = toDateKey(new Date())

    const closesByAsset = new Map<string, Map<string, number>>()
    for (const asset of assetMap.values()) {
      if (!isQuoteSupported(asset)) continue
      try {
        const points = await this.historical.getDailyCloses(asset.symbol, fromDate, toDate)
        closesByAsset.set(asset.id, new Map(points.map((p) => [p.date, p.close])))
      } catch (error) {
        console.warn('[backfill] history failed', asset.symbol, error)
      }
    }

    const fxSeries: [string, number][] = []
    try {
      const points = await this.historical.getDailyCloses(FX_SYMBOL, fromDate, toDate)
      for (const point of points) {
        if (point.close > 0) fxSeries.push([point.date, 1 / point.close])
      }
      fxSeries.sort((a, b) => a[0].localeCompare(b[0]))
    } catch (error) {
      console.warn('[backfill] FX history failed', error)
    }

    const fallbackResolver = await this.conversion.getResolver()
    const sorted = [...positionTxs].sort(
      (a, b) =>
        a.transactionDate.localeCompare(b.transactionDate) ||
        a.createdAt.localeCompare(b.createdAt),
    )

    const dates = enumerateDates(fromDate, toDate, MAX_DAYS)
    let days = 0

    for (const date of dates) {
      const subset = sorted.filter((t) => t.transactionDate <= date)
      if (subset.length === 0) continue
      const projection = projectPortfolio(subset)
      const open = projection.holdings.filter((holding) => holding.quantity > 0)
      if (open.length === 0) continue

      const marketValues: Money[] = []
      const costs: Money[] = []
      for (const holding of open) {
        const asset = assetMap.get(holding.assetId)
        if (!asset) continue
        const rate = this.rateFor(asset.currency, portfolio.baseCurrency, date, fxSeries, fallbackResolver)
        costs.push(convertMoney(holding.totalCost, portfolio.baseCurrency, rate))
        const close = lookupSeries(closesByAsset.get(asset.id), date)
        const pricePerShare =
          close != null
            ? fromMajor(close, asset.currency)
            : holding.averageCostPerShare ?? zero(asset.currency)
        const value = multiplyMoney(pricePerShare, holding.quantity)
        marketValues.push(convertMoney(value, portfolio.baseCurrency, rate))
      }

      if (marketValues.length === 0) continue
      await this.snapshots.upsert({
        portfolioId: portfolio.id,
        snapshotDate: date,
        marketValueMinor: sumMoney(marketValues, portfolio.baseCurrency).minorUnits,
        investedCapitalMinor: sumMoney(costs, portfolio.baseCurrency).minorUnits,
        cashValueMinor: 0,
        incomeMinor: 0,
        baseCurrency: portfolio.baseCurrency,
      })
      days += 1
    }

    return { days }
  }

  private rateFor(
    currency: CurrencyCode,
    base: CurrencyCode,
    date: string,
    fxSeries: [string, number][],
    fallback: { getRate(base: CurrencyCode, quote: CurrencyCode, date?: string): number | null },
  ): number {
    if (currency === base) return 1
    if (currency === 'USD' && base === 'EUR') {
      const rate = lookupForward(fxSeries, date)
      if (rate != null) return rate
    }
    return fallback.getRate(currency, base, date) ?? 1
  }
}

function isPosition(transaction: Transaction): boolean {
  return (
    transaction.transactionType === 'BUY' ||
    transaction.transactionType === 'SELL' ||
    transaction.transactionType === 'TRANSFER_IN' ||
    transaction.transactionType === 'TRANSFER_OUT'
  )
}

function enumerateDates(from: string, to: string, maxDays: number): string[] {
  const dates: string[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (cursor <= end && dates.length < maxDays) {
    dates.push(toDateKey(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function lookupSeries(
  series: Map<string, number> | undefined,
  date: string,
): number | null {
  if (!series) return null
  const exact = series.get(date)
  if (exact != null) return exact
  // No forward-fill here: missing prices fall back to cost.
  return null
}

function lookupForward(series: [string, number][], date: string): number | null {
  let result: number | null = null
  for (const [seriesDate, value] of series) {
    if (seriesDate <= date) result = value
    else break
  }
  return result
}
