import type { ExchangeRate } from '../../shared/domain'
import type { CurrencyCode } from '../../shared/domain'
import { executeStatement, queryAll } from '../db/client'
import { mapFxRate } from '../db/mappers'
import type { FxRateRow } from '../db/rows'

export interface FxRateWrite {
  readonly base: CurrencyCode
  readonly quote: CurrencyCode
  readonly rate: number
  readonly rateDate: string
  readonly timestamp: string
  readonly source: string
}

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

  async upsertRate(input: FxRateWrite): Promise<void> {
    await executeStatement(
      this.db,
      `INSERT INTO fx_rates (id, base_currency, quote_currency, rate, rate_date, timestamp, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (base_currency, quote_currency, rate_date) DO UPDATE SET
         rate = excluded.rate,
         timestamp = excluded.timestamp,
         source = excluded.source`,
      [
        crypto.randomUUID(),
        input.base,
        input.quote,
        input.rate,
        input.rateDate,
        input.timestamp,
        input.source,
      ],
    )
  }
}
