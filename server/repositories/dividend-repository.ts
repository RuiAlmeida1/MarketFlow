import type { DividendPayment } from '../../shared/domain'
import { executeStatement, queryAll } from '../db/client'
import { mapDividend } from '../db/mappers'
import type { DividendRow } from '../db/rows'

export class DividendRepository {
  constructor(private readonly db: D1Database) {}

  async listByPortfolio(portfolioId: string): Promise<DividendPayment[]> {
    const rows = await queryAll<DividendRow>(
      this.db,
      `SELECT * FROM dividend_payments
       WHERE portfolio_id = ?
       ORDER BY COALESCE(payment_date, ex_date) ASC`,
      [portfolioId],
    )
    return rows.map(mapDividend)
  }

  async listUpcoming(
    portfolioId: string,
    fromDate: string,
    limit = 8,
  ): Promise<DividendPayment[]> {
    const rows = await queryAll<DividendRow>(
      this.db,
      `SELECT * FROM dividend_payments
       WHERE portfolio_id = ?
         AND status IN ('EXPECTED', 'CONFIRMED')
         AND COALESCE(payment_date, ex_date) >= ?
       ORDER BY COALESCE(payment_date, ex_date) ASC
       LIMIT ?`,
      [portfolioId, fromDate, limit],
    )
    return rows.map(mapDividend)
  }

  async deleteByPortfolio(portfolioId: string): Promise<void> {
    await executeStatement(
      this.db,
      'DELETE FROM dividend_payments WHERE portfolio_id = ?',
      [portfolioId],
    )
  }
}
