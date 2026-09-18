import type { CurrencyCode, Transaction, TransactionType } from '../../shared/domain'
import { DatabaseError } from '../../shared/domain/errors'
import { executeBatch, executeStatement, queryAll, queryFirst } from '../db/client'
import { mapTransaction } from '../db/mappers'
import type { TransactionRow } from '../db/rows'

const INSERT_CHUNK_SIZE = 50

export interface TransactionWrite {
  readonly portfolioId: string
  readonly assetId: string | null
  readonly transactionType: TransactionType
  readonly quantity: number
  readonly priceMinor: number
  readonly feesMinor: number
  readonly taxesMinor: number
  readonly currency: CurrencyCode
  readonly exchangeRate: number
  readonly transactionDate: string
  readonly notes: string | null
}

export class TransactionRepository {
  constructor(private readonly db: D1Database) {}

  async listByPortfolio(portfolioId: string, limit = 2000): Promise<Transaction[]> {
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

  async findById(id: string): Promise<Transaction | null> {
    const row = await queryFirst<TransactionRow>(
      this.db,
      'SELECT * FROM transactions WHERE id = ? LIMIT 1',
      [id],
    )
    return row ? mapTransaction(row) : null
  }

  async create(input: TransactionWrite): Promise<Transaction> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    await executeStatement(
      this.db,
      `INSERT INTO transactions
         (id, portfolio_id, asset_id, transaction_type, quantity, price_minor, fees_minor,
          taxes_minor, currency, exchange_rate, transaction_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.portfolioId,
        input.assetId,
        input.transactionType,
        input.quantity,
        input.priceMinor,
        input.feesMinor,
        input.taxesMinor,
        input.currency,
        input.exchangeRate,
        input.transactionDate,
        input.notes,
        now,
        now,
      ],
    )
    const created = await this.findById(id)
    if (!created) throw new DatabaseError()
    return created
  }

  async update(
    id: string,
    input: Partial<Omit<TransactionWrite, 'portfolioId'>>,
  ): Promise<Transaction> {
    const current = await this.findById(id)
    if (!current) throw new DatabaseError('Transaction disappeared during update.')

    const merged: Omit<TransactionWrite, 'portfolioId'> = {
      assetId: input.assetId !== undefined ? input.assetId : current.assetId,
      transactionType: input.transactionType ?? current.transactionType,
      quantity: input.quantity ?? current.quantity,
      priceMinor: input.priceMinor ?? current.price.minorUnits,
      feesMinor: input.feesMinor ?? current.fees.minorUnits,
      taxesMinor: input.taxesMinor ?? current.taxes.minorUnits,
      currency: input.currency ?? current.price.currency,
      exchangeRate: input.exchangeRate ?? current.exchangeRate,
      transactionDate: input.transactionDate ?? current.transactionDate,
      notes: input.notes !== undefined ? input.notes : current.notes,
    }

    await executeStatement(
      this.db,
      `UPDATE transactions SET
         asset_id = ?, transaction_type = ?, quantity = ?, price_minor = ?, fees_minor = ?,
         taxes_minor = ?, currency = ?, exchange_rate = ?, transaction_date = ?, notes = ?,
         updated_at = ?
       WHERE id = ?`,
      [
        merged.assetId,
        merged.transactionType,
        merged.quantity,
        merged.priceMinor,
        merged.feesMinor,
        merged.taxesMinor,
        merged.currency,
        merged.exchangeRate,
        merged.transactionDate,
        merged.notes,
        new Date().toISOString(),
        id,
      ],
    )
    const updated = await this.findById(id)
    if (!updated) throw new DatabaseError()
    return updated
  }

  async delete(id: string): Promise<void> {
    await executeStatement(this.db, 'DELETE FROM transactions WHERE id = ?', [id])
  }

  async deleteByPortfolio(portfolioId: string): Promise<void> {
    await executeStatement(this.db, 'DELETE FROM transactions WHERE portfolio_id = ?', [
      portfolioId,
    ])
  }

  /**
   * Bulk inserts in chunks of {@link INSERT_CHUNK_SIZE} using D1 batches. Much
   * faster than issuing one statement per row (used by imports).
   */
  async insertMany(writes: readonly TransactionWrite[]): Promise<number> {
    const base = Date.now()
    for (let offset = 0; offset < writes.length; offset += INSERT_CHUNK_SIZE) {
      const chunk = writes.slice(offset, offset + INSERT_CHUNK_SIZE)
      const statements = chunk.map((input, index) => {
        // Strictly increasing timestamps preserve the intended order of
        // same-day events (e.g. a BUY and its SELL) when replaying.
        const createdAt = new Date(base + offset + index).toISOString()
        return this.db
          .prepare(
            `INSERT INTO transactions
               (id, portfolio_id, asset_id, transaction_type, quantity, price_minor, fees_minor,
                taxes_minor, currency, exchange_rate, transaction_date, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            input.portfolioId,
            input.assetId,
            input.transactionType,
            input.quantity,
            input.priceMinor,
            input.feesMinor,
            input.taxesMinor,
            input.currency,
            input.exchangeRate,
            input.transactionDate,
            input.notes,
            createdAt,
            createdAt,
          )
      })
      await executeBatch(this.db, statements)
    }
    return writes.length
  }
}
