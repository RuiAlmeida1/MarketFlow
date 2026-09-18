import type { Transaction } from '../../shared/domain'
import { queryAll } from '../db/client'
import { mapTransaction } from '../db/mappers'
import type { TransactionRow } from '../db/rows'

export class TransactionRepository {
  constructor(private readonly db: D1Database) {}

  async listByPortfolio(portfolioId: string, limit = 500): Promise<Transaction[]> {
    const rows = await queryAll<TransactionRow>(
      this.db,
      `SELECT * FROM transactions
       WHERE portfolio_id = ?
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT ?`,
      [portfolioId, limit],
    )
    return rows.map(mapTransaction)
  }

  async listByPortfolioAndAsset(
    portfolioId: string,
    assetId: string,
  ): Promise<Transaction[]> {
    const rows = await queryAll<TransactionRow>(
      this.db,
      `SELECT * FROM transactions
       WHERE portfolio_id = ? AND asset_id = ?
       ORDER BY transaction_date ASC, created_at ASC`,
      [portfolioId, assetId],
    )
    return rows.map(mapTransaction)
  }
}
