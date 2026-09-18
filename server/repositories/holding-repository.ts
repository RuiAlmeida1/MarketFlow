import type { CurrencyCode, HoldingRecord } from '../../shared/domain'
import { queryAll } from '../db/client'
import { mapHolding } from '../db/mappers'
import type { HoldingRow } from '../db/rows'

export interface HoldingWrite {
  readonly assetId: string
  readonly quantity: number
  readonly averageCostMinor: number
  readonly totalCostMinor: number
  readonly currency: CurrencyCode
}

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

  /** Distinct asset ids currently held (quantity != 0) across all portfolios. */
  async listDistinctAssetIds(): Promise<string[]> {
    const rows = await queryAll<{ asset_id: string }>(
      this.db,
      'SELECT DISTINCT asset_id FROM portfolio_holdings WHERE quantity <> 0',
    )
    return rows.map((row) => row.asset_id)
  }

  /**
   * Atomically replaces a portfolio's holdings with a projection rebuilt from
   * transactions. Positions with zero quantity are dropped.
   */
  async replaceAll(portfolioId: string, holdings: readonly HoldingWrite[]): Promise<void> {
    const now = new Date().toISOString()
    const statements: D1PreparedStatement[] = [
      this.db.prepare('DELETE FROM portfolio_holdings WHERE portfolio_id = ?').bind(portfolioId),
    ]

    for (const holding of holdings) {
      if (holding.quantity === 0) continue
      statements.push(
        this.db
          .prepare(
            `INSERT INTO portfolio_holdings
               (id, portfolio_id, asset_id, quantity, average_cost_minor, total_cost_minor, currency, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            portfolioId,
            holding.assetId,
            holding.quantity,
            holding.averageCostMinor,
            holding.totalCostMinor,
            holding.currency,
            now,
            now,
          ),
      )
    }

    await this.db.batch(statements)
  }
}
