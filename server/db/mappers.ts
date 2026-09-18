import type {
  Asset,
  AssetPriceRecord,
  DividendPayment,
  DividendStatus,
  ExchangeRate,
  HoldingRecord,
  Money,
  Portfolio,
  PortfolioSnapshot,
  Transaction,
  TransactionType,
  User,
  Watchlist,
  WatchlistItem,
} from '../../shared/domain'
import { isAssetType } from '../../shared/domain/assets/asset'
import { isDividendStatus } from '../../shared/domain/dividends/dividend'
import { DatabaseError, UnsupportedAssetError } from '../../shared/domain/errors'
import { assertCurrencyCode } from '../../shared/domain/money/currency'
import { money } from '../../shared/domain/money/money'
import { isTransactionType } from '../../shared/domain/transactions/transaction'
import type {
  AssetPriceRow,
  AssetRow,
  DividendRow,
  FxRateRow,
  HoldingRow,
  PortfolioRow,
  SnapshotRow,
  TransactionRow,
  UserRow,
  WatchlistItemRow,
  WatchlistRow,
} from './rows'

function assertTransactionType(value: string): TransactionType {
  if (!isTransactionType(value)) {
    throw new DatabaseError('Unrecognized transaction_type in database.')
  }
  return value
}

function assertDividendStatus(value: string): DividendStatus {
  if (!isDividendStatus(value)) {
    throw new DatabaseError('Unrecognized dividend status in database.')
  }
  return value
}

function assertAssetType(value: string) {
  if (!isAssetType(value)) {
    throw new UnsupportedAssetError(value)
  }
  return value
}

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    baseCurrency: assertCurrencyCode(row.base_currency),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapPortfolio(row: PortfolioRow): Portfolio {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    baseCurrency: assertCurrencyCode(row.base_currency),
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    assetType: assertAssetType(row.asset_type),
    exchange: row.exchange,
    currency: assertCurrencyCode(row.currency),
    isin: row.isin,
    sector: row.sector,
    industry: row.industry,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapHolding(row: HoldingRow): HoldingRecord {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    assetId: row.asset_id,
    quantity: row.quantity,
    averageCostMinor: row.average_cost_minor,
    totalCostMinor: row.total_cost_minor,
    currency: assertCurrencyCode(row.currency),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapTransaction(row: TransactionRow): Transaction {
  const currency = assertCurrencyCode(row.currency)
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    assetId: row.asset_id,
    transactionType: assertTransactionType(row.transaction_type),
    quantity: row.quantity,
    price: money(row.price_minor, currency),
    fees: money(row.fees_minor, currency),
    taxes: money(row.taxes_minor, currency),
    exchangeRate: row.exchange_rate,
    transactionDate: row.transaction_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapDividend(row: DividendRow): DividendPayment {
  const currency = assertCurrencyCode(row.currency)
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    assetId: row.asset_id,
    amountGross: money(row.amount_gross_minor, currency),
    taxAmount: money(row.tax_amount_minor, currency),
    amountNet: money(row.amount_net_minor, currency),
    currency,
    exDate: row.ex_date,
    recordDate: row.record_date,
    paymentDate: row.payment_date,
    shares: row.shares,
    dividendPerShare: money(row.dividend_per_share_minor, currency),
    status: assertDividendStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapWatchlist(row: WatchlistRow): Watchlist {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapWatchlistItem(row: WatchlistItemRow): WatchlistItem {
  const targetCurrency =
    row.target_currency != null ? assertCurrencyCode(row.target_currency) : null
  const targetPrice: Money | null =
    row.target_price_minor != null && targetCurrency != null
      ? money(row.target_price_minor, targetCurrency)
      : null
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    assetId: row.asset_id,
    targetPrice,
    targetCurrency,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapAssetPrice(row: AssetPriceRow): AssetPriceRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    price: money(row.price_minor, assertCurrencyCode(row.currency)),
    priceDate: row.price_date,
    timestamp: row.timestamp,
    source: row.source,
    createdAt: row.created_at,
  }
}

export function mapFxRate(row: FxRateRow): ExchangeRate {
  return {
    base: assertCurrencyCode(row.base_currency),
    quote: assertCurrencyCode(row.quote_currency),
    rate: row.rate,
    rateDate: row.rate_date,
    timestamp: row.timestamp,
    source: row.source,
  }
}

export function mapSnapshot(row: SnapshotRow): PortfolioSnapshot {
  const baseCurrency = assertCurrencyCode(row.base_currency)
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    snapshotDate: row.snapshot_date,
    marketValue: money(row.market_value_minor, baseCurrency),
    investedCapital: money(row.invested_capital_minor, baseCurrency),
    cashValue: money(row.cash_value_minor, baseCurrency),
    income: money(row.income_minor, baseCurrency),
    baseCurrency,
    createdAt: row.created_at,
  }
}
