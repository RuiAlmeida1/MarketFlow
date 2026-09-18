-- Migration 0003: one price row per (asset, day, source) so live refreshes can
-- upsert instead of inserting duplicates. Intraday snapshots are still
-- preserved per day by the `timestamp` column.

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_prices_unique_asset_date_source
  ON asset_prices (asset_id, price_date, source);
