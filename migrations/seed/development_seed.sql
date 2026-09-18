-- ============================================================================
-- DEVELOPMENT SEED ONLY. Never run against production.
--
-- Idempotent (INSERT OR IGNORE) so it can be re-applied safely.
-- Prices, costs and dividends are plausible but fictional approximations.
-- ============================================================================

INSERT OR IGNORE INTO users (id, email, display_name, base_currency) VALUES
  ('user-dev-1', 'dev@marketflow.local', 'Development User', 'EUR');

INSERT OR IGNORE INTO portfolios (id, user_id, name, description, base_currency, is_default) VALUES
  ('portfolio-dev-1', 'user-dev-1', 'Main Portfolio', 'Development seed portfolio', 'EUR', 1),
  ('portfolio-dev-2', 'user-dev-1', 'Income Portfolio', 'Development seed portfolio', 'EUR', 0);

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO assets (id, symbol, name, asset_type, exchange, currency, isin, sector, industry, country) VALUES
  ('asset-o',    'O',    'Realty Income Corporation',      'REIT',  'NYSE',      'USD', 'US7561091049', 'Real Estate',           'REIT - Retail',            'US'),
  ('asset-aapl', 'AAPL', 'Apple Inc.',                     'STOCK', 'NASDAQ',    'USD', 'US0378331005', 'Technology',            'Consumer Electronics',     'US'),
  ('asset-abbv', 'ABBV', 'AbbVie Inc.',                    'STOCK', 'NYSE',      'USD', 'US00287Y1091', 'Healthcare',            'Drug Manufacturers',       'US'),
  ('asset-jpm',  'JPM',  'JPMorgan Chase & Co.',           'STOCK', 'NYSE',      'USD', NULL,           'Financials',            'Banks - Diversified',      'US'),
  ('asset-nee',  'NEE',  'NextEra Energy, Inc.',           'STOCK', 'NYSE',      'USD', 'US65339F1012', 'Utilities',             'Utilities - Regulated',    'US'),
  ('asset-adp',  'ADP',  'Automatic Data Processing, Inc.','STOCK', 'NASDAQ',    'USD', 'US0530151036', 'Technology',            'Software - Application',   'US'),
  ('asset-dpz',  'DPZ',  'Domino''s Pizza, Inc.',          'STOCK', 'NYSE',      'USD', 'US25754A2015', 'Consumer Discretionary','Restaurants',              'US'),
  ('asset-wm',   'WM',   'Waste Management, Inc.',         'STOCK', 'NYSE',      'USD', 'US94106L1098', 'Industrials',           'Waste Management',         'US'),
  ('asset-msft', 'MSFT', 'Microsoft Corporation',          'STOCK', 'NASDAQ',    'USD', 'US5949181045', 'Technology',            'Software - Infrastructure','US'),
  ('asset-v',    'V',    'Visa Inc.',                      'STOCK', 'NYSE',      'USD', 'US92826C8394', 'Financials',            'Credit Services',          'US'),
  ('asset-schd', 'SCHD', 'Schwab US Dividend Equity ETF',  'ETF',   'NYSEARCA',  'USD', NULL,           'ETF',                   'Large Value',              'US'),
  ('asset-vwce', 'VWCE', 'Vanguard FTSE All-World UCITS',  'ETF',   'XETRA',     'EUR', 'IE00BK5BQT80', 'ETF',                   'Global Equity',            'IE'),
  ('asset-btc',  'BTC',  'Bitcoin',                        'CRYPTO',NULL,        'USD', NULL,           'Crypto',                'Digital Assets',           'US');

-- ---------------------------------------------------------------------------
-- FX rates (stored as 1 base = rate quote)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO fx_rates (id, base_currency, quote_currency, rate, rate_date, timestamp, source) VALUES
  ('fx-usd-eur-0917', 'USD', 'EUR', 0.9200, '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('fx-usd-eur-0918', 'USD', 'EUR', 0.9215, '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('fx-gbp-eur-0918', 'GBP', 'EUR', 1.1700, '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('fx-eur-usd-0918', 'EUR', 'USD', 1.0852, '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed');

-- ---------------------------------------------------------------------------
-- Asset prices: previous close (2026-09-17) + latest (2026-09-18)
-- Stored in minor units (cents). e.g. $58.40 -> 5840.
INSERT OR REPLACE INTO asset_prices (id, asset_id, price_minor, currency, price_date, timestamp, source) VALUES
  ('px-o-prev',    'asset-o',      5812, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-o-latest',  'asset-o',      5840, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-aapl-prev', 'asset-aapl',  24710, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-aapl-latest','asset-aapl', 24530, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-abbv-prev', 'asset-abbv',  20890, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-abbv-latest','asset-abbv', 21015, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-jpm-prev',  'asset-jpm',   28210, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-jpm-latest','asset-jpm',   28560, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-nee-prev',  'asset-nee',    8305, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-nee-latest','asset-nee',    8275, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-adp-prev',  'asset-adp',   30840, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-adp-latest','asset-adp',   31020, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-dpz-prev',  'asset-dpz',   44310, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-dpz-latest','asset-dpz',   44580, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-wm-prev',   'asset-wm',    22390, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-wm-latest', 'asset-wm',    22540, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-msft-prev', 'asset-msft',  50890, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-msft-latest','asset-msft', 51240, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-v-prev',    'asset-v',     34650, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-v-latest',  'asset-v',     34890, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-schd-prev', 'asset-schd',   2968, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-schd-latest','asset-schd',  2985, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-vwce-prev', 'asset-vwce',  13790, 'EUR', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-vwce-latest','asset-vwce', 13860, 'EUR', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed'),
  ('px-btc-prev',  'asset-btc', 9520000, 'USD', '2026-09-17', '2026-09-17T20:00:00.000Z', 'seed'),
  ('px-btc-latest','asset-btc', 9650000, 'USD', '2026-09-18', '2026-09-18T08:00:00.000Z', 'seed');

-- ---------------------------------------------------------------------------
-- Holdings (projection - rebuildable from transactions)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO portfolio_holdings (id, portfolio_id, asset_id, quantity, average_cost_minor, total_cost_minor, currency) VALUES
  ('hold-o',    'portfolio-dev-1', 'asset-o',    40, 5210, 208400, 'USD'),
  ('hold-aapl', 'portfolio-dev-1', 'asset-aapl',  8, 26000, 208000, 'USD'),
  ('hold-abbv', 'portfolio-dev-1', 'asset-abbv',  6, 18540, 111240, 'USD'),
  ('hold-jpm',  'portfolio-dev-1', 'asset-jpm',   5, 24000, 120000, 'USD'),
  ('hold-nee',  'portfolio-dev-1', 'asset-nee',  12, 8820, 105840, 'USD'),
  ('hold-adp',  'portfolio-dev-1', 'asset-adp',   3, 29500, 88500, 'USD'),
  ('hold-dpz',  'portfolio-dev-1', 'asset-dpz',   1, 48000, 48000, 'USD'),
  ('hold-wm',   'portfolio-dev-1', 'asset-wm',    4, 20000, 80000, 'USD');

-- ---------------------------------------------------------------------------
-- Transactions (source of truth)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO transactions (id, portfolio_id, asset_id, transaction_type, quantity, price_minor, fees_minor, taxes_minor, currency, exchange_rate, transaction_date, notes) VALUES
  ('tx-o-1',    'portfolio-dev-1', 'asset-o',    'BUY', 20, 4980, 200, 0, 'USD', 0.9180, '2025-06-12', 'Initial position'),
  ('tx-o-2',    'portfolio-dev-1', 'asset-o',    'BUY', 20, 5440, 200, 0, 'USD', 0.9260, '2025-11-04', 'Added on weakness'),
  ('tx-aapl-1', 'portfolio-dev-1', 'asset-aapl', 'BUY',  8, 26000, 300, 0, 'USD', 0.9200, '2025-05-20', 'Initial position'),
  ('tx-abbv-1', 'portfolio-dev-1', 'asset-abbv', 'BUY',  6, 18540, 200, 0, 'USD', 0.9210, '2025-07-08', 'Income position'),
  ('tx-jpm-1',  'portfolio-dev-1', 'asset-jpm',  'BUY',  5, 24000, 200, 0, 'USD', 0.9190, '2025-08-15', 'Initial position'),
  ('tx-nee-1',  'portfolio-dev-1', 'asset-nee',  'BUY', 12, 8820, 250, 0, 'USD', 0.9230, '2025-09-02', 'Utilities exposure'),
  ('tx-adp-1',  'portfolio-dev-1', 'asset-adp',  'BUY',  3, 29500, 200, 0, 'USD', 0.9250, '2025-10-10', 'Compounder'),
  ('tx-dpz-1',  'portfolio-dev-1', 'asset-dpz',  'BUY',  1, 48000, 150, 0, 'USD', 0.9280, '2026-01-22', 'Small starter'),
  ('tx-wm-1',   'portfolio-dev-1', 'asset-wm',   'BUY',  4, 20000, 200, 0, 'USD', 0.9220, '2026-02-11', 'Wide moat'),
  ('tx-dep-1',  'portfolio-dev-1', NULL,          'DEPOSIT', 0, 892382, 0, 0, 'EUR', 1, '2025-05-15', 'Cash contribution');

-- ---------------------------------------------------------------------------
-- Dividends 2026 (received Jan-Sep, expected Oct-Dec)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO dividend_payments (id, portfolio_id, asset_id, amount_gross_minor, tax_amount_minor, amount_net_minor, currency, ex_date, record_date, payment_date, shares, dividend_per_share_minor, status) VALUES
  ('div-o-2026-01',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-01-02', '2026-01-02', '2026-01-15', 40, 264, 'RECEIVED'),
  ('div-o-2026-02',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-02-02', '2026-02-02', '2026-02-13', 40, 264, 'RECEIVED'),
  ('div-o-2026-03',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-03-02', '2026-03-02', '2026-03-13', 40, 264, 'RECEIVED'),
  ('div-o-2026-04',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-04-01', '2026-04-01', '2026-04-15', 40, 264, 'RECEIVED'),
  ('div-o-2026-05',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-05-01', '2026-05-01', '2026-05-15', 40, 264, 'RECEIVED'),
  ('div-o-2026-06',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-06-01', '2026-06-01', '2026-06-15', 40, 264, 'RECEIVED'),
  ('div-o-2026-07',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-07-01', '2026-07-01', '2026-07-15', 40, 264, 'RECEIVED'),
  ('div-o-2026-08',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-08-03', '2026-08-03', '2026-08-14', 40, 264, 'RECEIVED'),
  ('div-o-2026-09',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-09-01', '2026-09-01', '2026-09-15', 40, 264, 'RECEIVED'),
  ('div-o-2026-10',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-10-01', '2026-10-01', '2026-10-15', 40, 264, 'EXPECTED'),
  ('div-o-2026-11',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-11-02', '2026-11-02', '2026-11-13', 40, 264, 'EXPECTED'),
  ('div-o-2026-12',  'portfolio-dev-1', 'asset-o',   1056, 158, 898, 'USD', '2026-12-01', '2026-12-01', '2026-12-15', 40, 264, 'EXPECTED'),
  ('div-aapl-2026-02','portfolio-dev-1','asset-aapl', 208,  31, 177, 'USD', '2026-02-07', '2026-02-09', '2026-02-13', 8,   26, 'RECEIVED'),
  ('div-aapl-2026-05','portfolio-dev-1','asset-aapl', 208,  31, 177, 'USD', '2026-05-09', '2026-05-11', '2026-05-15', 8,   26, 'RECEIVED'),
  ('div-aapl-2026-08','portfolio-dev-1','asset-aapl', 208,  31, 177, 'USD', '2026-08-08', '2026-08-10', '2026-08-14', 8,   26, 'RECEIVED'),
  ('div-aapl-2026-11','portfolio-dev-1','asset-aapl', 208,  31, 177, 'USD', '2026-11-07', '2026-11-09', '2026-11-13', 8,   26, 'EXPECTED'),
  ('div-abbv-2026-02','portfolio-dev-1','asset-abbv', 984, 148, 836, 'USD', '2026-01-15', '2026-01-16', '2026-02-13', 6,  164, 'RECEIVED'),
  ('div-abbv-2026-05','portfolio-dev-1','asset-abbv', 984, 148, 836, 'USD', '2026-04-14', '2026-04-15', '2026-05-15', 6,  164, 'RECEIVED'),
  ('div-abbv-2026-08','portfolio-dev-1','asset-abbv', 984, 148, 836, 'USD', '2026-07-14', '2026-07-15', '2026-08-14', 6,  164, 'RECEIVED'),
  ('div-abbv-2026-11','portfolio-dev-1','asset-abbv', 984, 148, 836, 'USD', '2026-10-14', '2026-10-15', '2026-11-13', 6,  164, 'EXPECTED'),
  ('div-jpm-2026-01', 'portfolio-dev-1', 'asset-jpm',  625,  94, 531, 'USD', '2026-01-05', '2026-01-06', '2026-01-31', 5,  125, 'RECEIVED'),
  ('div-jpm-2026-04', 'portfolio-dev-1', 'asset-jpm',  625,  94, 531, 'USD', '2026-04-04', '2026-04-06', '2026-04-30', 5,  125, 'RECEIVED'),
  ('div-jpm-2026-07', 'portfolio-dev-1', 'asset-jpm',  625,  94, 531, 'USD', '2026-07-04', '2026-07-06', '2026-07-31', 5,  125, 'RECEIVED'),
  ('div-jpm-2026-10', 'portfolio-dev-1', 'asset-jpm',  625,  94, 531, 'USD', '2026-10-05', '2026-10-06', '2026-10-31', 5,  125, 'EXPECTED'),
  ('div-nee-2026-03', 'portfolio-dev-1', 'asset-nee',  680, 102, 578, 'USD', '2026-02-27', '2026-03-02', '2026-03-17', 12,  57, 'RECEIVED'),
  ('div-nee-2026-06', 'portfolio-dev-1', 'asset-nee',  680, 102, 578, 'USD', '2026-05-28', '2026-06-01', '2026-06-17', 12,  57, 'RECEIVED'),
  ('div-nee-2026-09', 'portfolio-dev-1', 'asset-nee',  680, 102, 578, 'USD', '2026-08-28', '2026-09-01', '2026-09-17', 12,  57, 'RECEIVED'),
  ('div-nee-2026-12', 'portfolio-dev-1', 'asset-nee',  680, 102, 578, 'USD', '2026-11-27', '2026-12-01', '2026-12-17', 12,  57, 'EXPECTED'),
  ('div-adp-2026-03', 'portfolio-dev-1', 'asset-adp',  462,  69, 393, 'USD', '2026-03-06', '2026-03-06', '2026-03-14', 3,  154, 'RECEIVED'),
  ('div-adp-2026-06', 'portfolio-dev-1', 'asset-adp',  462,  69, 393, 'USD', '2026-06-05', '2026-06-05', '2026-06-13', 3,  154, 'RECEIVED'),
  ('div-adp-2026-09', 'portfolio-dev-1', 'asset-adp',  462,  69, 393, 'USD', '2026-09-04', '2026-09-04', '2026-09-12', 3,  154, 'RECEIVED'),
  ('div-adp-2026-12', 'portfolio-dev-1', 'asset-adp',  462,  69, 393, 'USD', '2026-12-04', '2026-12-04', '2026-12-12', 3,  154, 'EXPECTED'),
  ('div-wm-2026-03',  'portfolio-dev-1', 'asset-wm',   378,  57, 321, 'USD', '2026-03-05', '2026-03-06', '2026-03-21', 4,   95, 'RECEIVED'),
  ('div-wm-2026-06',  'portfolio-dev-1', 'asset-wm',   378,  57, 321, 'USD', '2026-06-04', '2026-06-05', '2026-06-20', 4,   95, 'RECEIVED'),
  ('div-wm-2026-09',  'portfolio-dev-1', 'asset-wm',   378,  57, 321, 'USD', '2026-09-03', '2026-09-04', '2026-09-19', 4,   95, 'CONFIRMED'),
  ('div-wm-2026-12',  'portfolio-dev-1', 'asset-wm',   378,  57, 321, 'USD', '2026-12-03', '2026-12-04', '2026-12-19', 4,   95, 'EXPECTED'),
  ('div-dpz-2026-03', 'portfolio-dev-1', 'asset-dpz',  174,  26, 148, 'USD', '2026-03-13', '2026-03-13', '2026-03-28', 1,  174, 'RECEIVED'),
  ('div-dpz-2026-06', 'portfolio-dev-1', 'asset-dpz',  174,  26, 148, 'USD', '2026-06-12', '2026-06-12', '2026-06-27', 1,  174, 'RECEIVED'),
  ('div-dpz-2026-09', 'portfolio-dev-1', 'asset-dpz',  174,  26, 148, 'USD', '2026-09-11', '2026-09-11', '2026-09-26', 1,  174, 'CONFIRMED'),
  ('div-dpz-2026-12', 'portfolio-dev-1', 'asset-dpz',  174,  26, 148, 'USD', '2026-12-11', '2026-12-11', '2026-12-26', 1,  174, 'EXPECTED');

-- ---------------------------------------------------------------------------
-- Watchlists
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO watchlists (id, user_id, name, is_default) VALUES
  ('watchlist-dev-1', 'user-dev-1', 'Dividend Growth', 1),
  ('watchlist-dev-2', 'user-dev-1', 'Tech & Growth', 0),
  ('watchlist-dev-3', 'user-dev-1', 'Global ETFs', 0);

INSERT OR IGNORE INTO watchlist_items (id, watchlist_id, asset_id, target_price_minor, target_currency, notes) VALUES
  ('wli-1', 'watchlist-dev-1', 'asset-o',    5500,  'USD', 'Add below $55'),
  ('wli-2', 'watchlist-dev-1', 'asset-abbv', 19500, 'USD', 'Accumulate on pullback'),
  ('wli-3', 'watchlist-dev-1', 'asset-jpm',  26000, 'USD', 'Quality bank'),
  ('wli-4', 'watchlist-dev-1', 'asset-nee',  7800,  'USD', 'Rate-sensitive utility'),
  ('wli-5', 'watchlist-dev-1', 'asset-adp',  29000, 'USD', 'Compounder'),
  ('wli-6', 'watchlist-dev-2', 'asset-aapl', 22000, 'USD', 'Wait for better entry'),
  ('wli-7', 'watchlist-dev-2', 'asset-msft', 46000, 'USD', 'Cloud growth'),
  ('wli-8', 'watchlist-dev-2', 'asset-v',    32000, 'USD', 'Payments network'),
  ('wli-9', 'watchlist-dev-3', 'asset-schd', 2800,  'USD', 'Dividend ETF'),
  ('wli-10','watchlist-dev-3', 'asset-vwce', 13000, 'EUR', 'Core global ETF');

-- ---------------------------------------------------------------------------
-- Portfolio snapshots (historical series for the performance chart, EUR)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO portfolio_snapshots (id, portfolio_id, snapshot_date, market_value_minor, invested_capital_minor, cash_value_minor, income_minor, base_currency) VALUES
  ('snap-2025-10', 'portfolio-dev-1', '2025-10-01',  820000, 790000, 25000,  3200, 'EUR'),
  ('snap-2025-11', 'portfolio-dev-1', '2025-11-01',  845000, 790000, 25000,  6800, 'EUR'),
  ('snap-2025-12', 'portfolio-dev-1', '2025-12-01',  872000, 815000, 25000, 10400, 'EUR'),
  ('snap-2026-01', 'portfolio-dev-1', '2026-01-01',  861000, 815000, 30000, 11800, 'EUR'),
  ('snap-2026-02', 'portfolio-dev-1', '2026-02-01',  888000, 840000, 30000, 15200, 'EUR'),
  ('snap-2026-03', 'portfolio-dev-1', '2026-03-01',  899000, 840000, 30000, 17100, 'EUR'),
  ('snap-2026-04', 'portfolio-dev-1', '2026-04-01',  912000, 865000, 35000, 20500, 'EUR'),
  ('snap-2026-05', 'portfolio-dev-1', '2026-05-01',  894000, 865000, 35000, 23800, 'EUR'),
  ('snap-2026-06', 'portfolio-dev-1', '2026-06-01',  925000, 890000, 35000, 26200, 'EUR'),
  ('snap-2026-07', 'portfolio-dev-1', '2026-07-01',  938000, 892382, 35000, 28600, 'EUR'),
  ('snap-2026-08', 'portfolio-dev-1', '2026-08-01',  919000, 892382, 35000, 31100, 'EUR'),
  ('snap-2026-09', 'portfolio-dev-1', '2026-09-01',  943764, 892382, 35000, 33700, 'EUR');
