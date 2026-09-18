import type { PortfolioSnapshot } from '../../shared/domain'
import { queryAll, queryFirst } from '../db/client'
import { mapSnapshot } from '../db/mappers'
import type { SnapshotRow } from '../db/rows'

export class SnapshotRepository {
  constructor(private readonly db: D1Database) {}

  async listByPortfolio(portfolioId: string): Promise<PortfolioSnapshot[]> {
    const rows = await queryAll<SnapshotRow>(
      this.db,
      `SELECT * FROM portfolio_snapshots
       WHERE portfolio_id = ?
       ORDER BY snapshot_date ASC`,
      [portfolioId],
    )
    return rows.map(mapSnapshot)
  }

  async latest(portfolioId: string): Promise<PortfolioSnapshot | null> {
    const row = await queryFirst<SnapshotRow>(
      this.db,
      `SELECT * FROM portfolio_snapshots
       WHERE portfolio_id = ?
       ORDER BY snapshot_date DESC
       LIMIT 1`,
      [portfolioId],
    )
    return row ? mapSnapshot(row) : null
  }
}
