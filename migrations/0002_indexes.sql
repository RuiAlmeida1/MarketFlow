-- Migration 0002: indexes and uniqueness constraints.
-- Added separately from 0001 to keep migrations incremental and auditable.

-- Users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Portfolios
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_one_default_per_user
  ON portfolios (user_id) WHERE is_default = 1;

-- Assets
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets (symbol);
CREATE INDEX IF NOT EXISTS idx_assets_exchange ON assets (exchange);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets (asset_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_symbol_exchange
  ON assets (symbol, COALESCE(exchange, ''));
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_isin
  ON assets (isin) WHERE isin IS NOT NULL;

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions (asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_date
  ON transactions (portfolio_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_type
  ON transactions (portfolio_id, transaction_type);

-- Holdings
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_id ON portfolio_holdings (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_holdings_asset_id ON portfolio_holdings (asset_id);

-- Dividends
CREATE INDEX IF NOT EXISTS idx_dividends_portfolio_id ON dividend_payments (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_dividends_asset_id ON dividend_payments (asset_id);
CREATE INDEX IF NOT EXISTS idx_dividends_payment_date ON dividend_payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_dividends_status ON dividend_payments (status);
CREATE INDEX IF NOT EXISTS idx_dividends_portfolio_status
  ON dividend_payments (portfolio_id, status);

-- Watchlists
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists (user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON watchlist_items (watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_asset_id ON watchlist_items (asset_id);

-- Asset prices
CREATE INDEX IF NOT EXISTS idx_asset_prices_asset_timestamp
  ON asset_prices (asset_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_asset_prices_asset_date
  ON asset_prices (asset_id, price_date);
CREATE INDEX IF NOT EXISTS idx_asset_prices_date ON asset_prices (price_date);

-- FX rates
CREATE INDEX IF NOT EXISTS idx_fx_rates_pair_date
  ON fx_rates (base_currency, quote_currency, rate_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fx_rates_unique_pair_date
  ON fx_rates (base_currency, quote_currency, rate_date);

-- Snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_portfolio_date
  ON portfolio_snapshots (portfolio_id, snapshot_date);
