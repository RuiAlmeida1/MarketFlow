import type { Watchlist, WatchlistItem } from '../../shared/domain'
import { placeholders, queryAll, queryFirst } from '../db/client'
import { mapWatchlist, mapWatchlistItem } from '../db/mappers'
import type { WatchlistItemRow, WatchlistRow } from '../db/rows'

export class WatchlistRepository {
  constructor(private readonly db: D1Database) {}

  async listByUser(userId: string): Promise<Watchlist[]> {
    const rows = await queryAll<WatchlistRow>(
      this.db,
      'SELECT * FROM watchlists WHERE user_id = ? ORDER BY is_default DESC, name ASC',
      [userId],
    )
    return rows.map(mapWatchlist)
  }

  async findDefaultByUser(userId: string): Promise<Watchlist | null> {
    const row = await queryFirst<WatchlistRow>(
      this.db,
      'SELECT * FROM watchlists WHERE user_id = ? ORDER BY is_default DESC, created_at ASC LIMIT 1',
      [userId],
    )
    return row ? mapWatchlist(row) : null
  }

  async listItemsByWatchlistIds(ids: readonly string[]): Promise<WatchlistItem[]> {
    if (ids.length === 0) return []
    const rows = await queryAll<WatchlistItemRow>(
      this.db,
      `SELECT * FROM watchlist_items
       WHERE watchlist_id IN (${placeholders(ids.length)})
       ORDER BY created_at ASC`,
      [...ids],
    )
    return rows.map(mapWatchlistItem)
  }
}
