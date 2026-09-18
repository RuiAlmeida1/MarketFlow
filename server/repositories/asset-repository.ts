import type { Asset, AssetType } from '../../shared/domain'
import { DatabaseError } from '../../shared/domain/errors'
import type { CurrencyCode } from '../../shared/domain'
import { executeStatement, placeholders, queryAll, queryFirst } from '../db/client'
import { mapAsset } from '../db/mappers'
import type { AssetRow } from '../db/rows'

const SEARCH_LIMIT = 25

export interface AssetCreateInput {
  symbol: string
  name: string
  assetType: AssetType
  exchange?: string | null
  currency: CurrencyCode
  isin?: string | null
  sector?: string | null
  industry?: string | null
  country?: string | null
}

export class AssetRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<Asset | null> {
    const row = await queryFirst<AssetRow>(
      this.db,
      'SELECT * FROM assets WHERE id = ? LIMIT 1',
      [id],
    )
    return row ? mapAsset(row) : null
  }

  async findManyByIds(ids: readonly string[]): Promise<Map<string, Asset>> {
    if (ids.length === 0) return new Map()
    const rows = await queryAll<AssetRow>(
      this.db,
      `SELECT * FROM assets WHERE id IN (${placeholders(ids.length)})`,
      [...ids],
    )
    return new Map(rows.map((row) => [row.id, mapAsset(row)]))
  }

  async search(query: string, limit = SEARCH_LIMIT): Promise<Asset[]> {
    const normalized = query.trim()
    if (!normalized) return []
    const pattern = `%${normalized}%`
    const rows = await queryAll<AssetRow>(
      this.db,
      `SELECT * FROM assets
       WHERE symbol LIKE ? OR name LIKE ?
       ORDER BY symbol ASC
       LIMIT ?`,
      [pattern, pattern, limit],
    )
    return rows.map(mapAsset)
  }

  async findBySymbol(symbol: string): Promise<Asset | null> {
    const row = await queryFirst<AssetRow>(
      this.db,
      'SELECT * FROM assets WHERE symbol = ? COLLATE NOCASE ORDER BY created_at ASC LIMIT 1',
      [symbol.trim()],
    )
    return row ? mapAsset(row) : null
  }

  async findBySymbolAndExchange(
    symbol: string,
    exchange: string | null,
    currency: CurrencyCode,
  ): Promise<Asset | null> {
    const row = await queryFirst<AssetRow>(
      this.db,
      "SELECT * FROM assets WHERE symbol = ? COLLATE NOCASE AND COALESCE(exchange, '') = ? AND currency = ? LIMIT 1",
      [symbol.trim(), exchange ?? '', currency],
    )
    return row ? mapAsset(row) : null
  }

  async create(input: AssetCreateInput): Promise<Asset> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    await executeStatement(
      this.db,
      `INSERT INTO assets
         (id, symbol, name, asset_type, exchange, currency, isin, sector, industry, country, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.symbol,
        input.name,
        input.assetType,
        input.exchange ?? null,
        input.currency,
        input.isin ?? null,
        input.sector ?? null,
        input.industry ?? null,
        input.country ?? null,
        now,
        now,
      ],
    )
    const created = await this.findById(id)
    if (!created) throw new DatabaseError()
    return created
  }

  /**
   * Resolves an asset by (symbol, exchange), falling back to an existing
   * listing of the same instrument in the same currency, and finally creating a
   * minimal record. This keeps distinct listings (e.g. NKE on XETRA vs US)
   * as separate assets so currencies never mix.
   */
  async findOrCreateAsset(input: {
    symbol: string
    currency: CurrencyCode
    exchange?: string | null
    country?: string | null
    name?: string
  }): Promise<Asset> {
    const symbol = input.symbol.trim().toUpperCase()
    const exchange = input.exchange ?? null

    const exact = await this.findBySymbolAndExchange(symbol, exchange, input.currency)
    if (exact) return exact

    const bySymbol = await this.findBySymbol(symbol)
    if (bySymbol && bySymbol.currency === input.currency) return bySymbol

    return this.create({
      symbol,
      name: input.name ?? symbol,
      assetType: 'STOCK',
      exchange,
      currency: input.currency,
      country: input.country ?? 'US',
    })
  }
}
