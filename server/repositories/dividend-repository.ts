import type { CurrencyCode, DividendPayment } from '../../shared/domain'
import { executeStatement, queryAll } from '../db/client'
import { mapDividend } from '../db/mappers'
import type { DividendRow } from '../db/rows'

export interface DividendWrite {
  readonly assetId: string
  readonly amountGrossMinor: number
  readonly taxAmountMinor: number
  readonly amountNetMinor: number
  readonly currency: CurrencyCode
  readonly date: string
}

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

  /** Atomically replaces a portfolio's dividend payments with a projection. */
  async replaceAll(
    portfolioId: string,
    payments: readonly DividendWrite[],
  ): Promise<void> {
    const now = new Date().toISOString()
    const statements: D1PreparedStatement[] = [
      this.db
        .prepare('DELETE FROM dividend_payments WHERE portfolio_id = ?')
        .bind(portfolioId),
    ]

    for (const payment of payments) {
      statements.push(
        this.db
          .prepare(
            `INSERT INTO dividend_payments
               (id, portfolio_id, asset_id, amount_gross_minor, tax_amount_minor, amount_net_minor,
                currency, ex_date, record_date, payment_date, shares, dividend_per_share_minor,
                status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 0, 'RECEIVED', ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            portfolioId,
            payment.assetId,
            payment.amountGrossMinor,
            payment.taxAmountMinor,
            payment.amountNetMinor,
            payment.currency,
            payment.date,
            payment.date,
            now,
            now,
          ),
      )
    }

    await this.db.batch(statements)
  }
}
