import type { HoldingRecord } from '../../shared/domain'
import { queryAll } from '../db/client'
import { mapHolding } from '../db/mappers'
import type { HoldingRow } from '../db/rows'

export class HoldingRepository {
  constructor(private readonly db: D1Database) {}

  async listByPortfolio(portfolioId: string): Promise<HoldingRecord[]> {
    const rows = await queryAll<HoldingRow>(
      this.db,
      'SELECT * FROM portfolio_holdings WHERE portfolio_id = ? ORDER BY created_at ASC',
      [portfolioId],
    )
    return rows.map(mapHolding)
  }
}
