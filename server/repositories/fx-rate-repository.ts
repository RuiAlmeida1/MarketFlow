import type { ExchangeRate } from '../../shared/domain'
import { queryAll } from '../db/client'
import { mapFxRate } from '../db/mappers'
import type { FxRateRow } from '../db/rows'

export class FxRateRepository {
  constructor(private readonly db: D1Database) {}

  /** Latest rate per currency pair using a window function. */
  async latestRates(): Promise<ExchangeRate[]> {
    const rows = await queryAll<FxRateRow>(
      this.db,
      `SELECT * FROM (
         SELECT fx_rates.*,
                ROW_NUMBER() OVER (
                  PARTITION BY base_currency, quote_currency
                  ORDER BY rate_date DESC, timestamp DESC
                ) AS rn
         FROM fx_rates
       )
       WHERE rn = 1`,
    )
    return rows.map(mapFxRate)
  }
}
