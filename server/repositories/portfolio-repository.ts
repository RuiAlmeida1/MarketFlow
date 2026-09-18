import type { Portfolio } from '../../shared/domain'
import { queryAll, queryFirst } from '../db/client'
import { mapPortfolio } from '../db/mappers'
import type { PortfolioRow } from '../db/rows'

export class PortfolioRepository {
  constructor(private readonly db: D1Database) {}

  async listByUser(userId: string): Promise<Portfolio[]> {
    const rows = await queryAll<PortfolioRow>(
      this.db,
      'SELECT * FROM portfolios WHERE user_id = ? ORDER BY is_default DESC, name ASC',
      [userId],
    )
    return rows.map(mapPortfolio)
  }

  async findById(id: string): Promise<Portfolio | null> {
    const row = await queryFirst<PortfolioRow>(
      this.db,
      'SELECT * FROM portfolios WHERE id = ? LIMIT 1',
      [id],
    )
    return row ? mapPortfolio(row) : null
  }

  async findDefaultForUser(userId: string): Promise<Portfolio | null> {
    const row = await queryFirst<PortfolioRow>(
      this.db,
      'SELECT * FROM portfolios WHERE user_id = ? ORDER BY is_default DESC, created_at ASC LIMIT 1',
      [userId],
    )
    return row ? mapPortfolio(row) : null
  }
}
