/**
 * D1 row shapes. These mirror the SQL schema exactly (snake_case) and are the
 * only place raw persistence shapes are allowed to exist.
 */

export interface UserRow {
  id: string
  email: string
  display_name: string
  base_currency: string
  created_at: string
  updated_at: string
}

export interface PortfolioRow {
  id: string
  user_id: string
  name: string
  description: string | null
  base_currency: string
  is_default: number
  created_at: string
  updated_at: string
}

export interface AssetRow {
  id: string
  symbol: string
  name: string
  asset_type: string
  exchange: string | null
  currency: string
  isin: string | null
  sector: string | null
  industry: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export interface HoldingRow {
  id: string
  portfolio_id: string
  asset_id: string
  quantity: number
  average_cost_minor: number
  total_cost_minor: number
  currency: string
  created_at: string
  updated_at: string
}

export interface TransactionRow {
  id: string
  portfolio_id: string
  asset_id: string | null
  transaction_type: string
  quantity: number
  price_minor: number
  fees_minor: number
  taxes_minor: number
  currency: string
  exchange_rate: number
  transaction_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DividendRow {
  id: string
  portfolio_id: string
  asset_id: string
  amount_gross_minor: number
  tax_amount_minor: number
  amount_net_minor: number
  currency: string
  ex_date: string
  record_date: string | null
  payment_date: string | null
  shares: number
  dividend_per_share_minor: number
  status: string
  created_at: string
  updated_at: string
}

export interface WatchlistRow {
  id: string
  user_id: string
  name: string
  is_default: number
  created_at: string
  updated_at: string
}

export interface WatchlistItemRow {
  id: string
  watchlist_id: string
  asset_id: string
  target_price_minor: number | null
  target_currency: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AssetPriceRow {
  id: string
  asset_id: string
  price_minor: number
  currency: string
  price_date: string
  timestamp: string
  source: string
  created_at: string
}

export interface FxRateRow {
  id: string
  base_currency: string
  quote_currency: string
  rate: number
  rate_date: string
  timestamp: string
  source: string
  created_at: string
}

export interface SnapshotRow {
  id: string
  portfolio_id: string
  snapshot_date: string
  market_value_minor: number
  invested_capital_minor: number
  cash_value_minor: number
  income_minor: number
  base_currency: string
  created_at: string
}
