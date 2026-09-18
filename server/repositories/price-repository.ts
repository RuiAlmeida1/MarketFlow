import type { AssetPriceRecord, Money } from '../../shared/domain'
import { executeStatement, placeholders, queryAll, queryFirst } from '../db/client'
import { mapAssetPrice } from '../db/mappers'
import type { AssetPriceRow } from '../db/rows'

interface RankedPriceRow extends AssetPriceRow {
  rn: number
}

export interface AssetPricePair {
  readonly latest: AssetPriceRecord | null
  readonly previous: AssetPriceRecord | null
}

export class PriceRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Returns the two most recent prices per asset in a single query using a
   * window function, avoiding an N+1 pattern across holdings.
   */
  async latestAndPrevious(
    assetIds: readonly string[],
  ): Promise<Map<string, AssetPricePair>> {
    if (assetIds.length === 0) return new Map()

    const rows = await queryAll<RankedPriceRow>(
      this.db,
      `SELECT * FROM (
         SELECT asset_prices.*,
                ROW_NUMBER() OVER (
                  PARTITION BY asset_id ORDER BY timestamp DESC
                ) AS rn
         FROM asset_prices
         WHERE asset_id IN (${placeholders(assetIds.length)})
       )
       WHERE rn <= 2`,
      [...assetIds],
    )

    const result = new Map<string, AssetPricePair>()
    for (const row of rows) {
      const existing = result.get(row.asset_id) ?? { latest: null, previous: null }
      const record = mapAssetPrice(row)
      if (row.rn === 1) {
        result.set(row.asset_id, { latest: record, previous: existing.previous })
      } else if (row.rn === 2) {
        result.set(row.asset_id, { latest: existing.latest, previous: record })
      }
    }
    return result
  }

  async historyForAsset(assetId: string, limit = 365): Promise<AssetPriceRecord[]> {
    const rows = await queryAll<AssetPriceRow>(
      this.db,
      `SELECT * FROM asset_prices
       WHERE asset_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [assetId, limit],
    )
    return rows.map(mapAssetPrice)
  }

  /** Most recent timestamp for a given source, or null when none exists. */
  async latestSourceTimestamp(source: string): Promise<string | null> {
    const row = await queryFirst<{ latest: string | null }>(
      this.db,
      'SELECT MAX(timestamp) AS latest FROM asset_prices WHERE source = ?',
      [source],
    )
    return row?.latest ?? null
  }

  /** Insert or update the single price for an (asset, day, source). */
  async upsertPrice(input: {
    assetId: string
    price: Money
    priceDate: string
    timestamp: string
    source: string
  }): Promise<void> {
    await executeStatement(
      this.db,
      `INSERT INTO asset_prices (id, asset_id, price_minor, currency, price_date, timestamp, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (asset_id, price_date, source) DO UPDATE SET
         price_minor = excluded.price_minor,
         currency = excluded.currency,
         timestamp = excluded.timestamp`,
      [
        crypto.randomUUID(),
        input.assetId,
        input.price.minorUnits,
        input.price.currency,
        input.priceDate,
        input.timestamp,
        input.source,
      ],
    )
  }
}
