import type { Asset } from '../../shared/domain'
import { placeholders, queryAll, queryFirst } from '../db/client'
import { mapAsset } from '../db/mappers'
import type { AssetRow } from '../db/rows'

const SEARCH_LIMIT = 25

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
}
