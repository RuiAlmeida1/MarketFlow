import type { CurrencyCode, PortfolioSnapshot } from '../../shared/domain'
import { executeStatement, queryAll, queryFirst } from '../db/client'
import { mapSnapshot } from '../db/mappers'
import type { SnapshotRow } from '../db/rows'

export interface SnapshotWrite {
  readonly portfolioId: string
  readonly snapshotDate: string
  readonly marketValueMinor: number
  readonly investedCapitalMinor: number
  readonly cashValueMinor: number
  readonly incomeMinor: number
  readonly baseCurrency: CurrencyCode
}

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

  /** Upserts the snapshot for a (portfolio, date). */
  async upsert(input: SnapshotWrite): Promise<void> {
    await executeStatement(
      this.db,
      `INSERT INTO portfolio_snapshots
         (id, portfolio_id, snapshot_date, market_value_minor, invested_capital_minor,
          cash_value_minor, income_minor, base_currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (portfolio_id, snapshot_date) DO UPDATE SET
         market_value_minor = excluded.market_value_minor,
         invested_capital_minor = excluded.invested_capital_minor,
         cash_value_minor = excluded.cash_value_minor,
         income_minor = excluded.income_minor,
         base_currency = excluded.base_currency`,
      [
        crypto.randomUUID(),
        input.portfolioId,
        input.snapshotDate,
        input.marketValueMinor,
        input.investedCapitalMinor,
        input.cashValueMinor,
        input.incomeMinor,
        input.baseCurrency,
      ],
    )
  }
}
