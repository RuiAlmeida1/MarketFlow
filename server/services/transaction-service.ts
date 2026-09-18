import type { CurrencyCode, Transaction } from '../../shared/domain'
import { isPositionTransaction } from '../../shared/domain'
import { NotFoundError } from '../../shared/domain/errors'
import { fromMajor } from '../../shared/domain/money/money'
import type { AssetRepository } from '../repositories/asset-repository'
import type {
  TransactionRepository,
  TransactionWrite,
} from '../repositories/transaction-repository'
import type {
  TransactionInput,
  TransactionUpdateInput,
} from '../validation/transactions'
import type { DividendProjectionService } from './dividend-projection-service'
import type { HoldingsService } from './holdings-service'

export interface ImportResult {
  readonly inserted: number
}

/**
 * Application service for transaction writes. Every mutation rebuilds the
 * holdings projection so `portfolio_holdings` always mirrors the log.
 */
export class TransactionService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly transactions: TransactionRepository,
    private readonly dividendProjection: DividendProjectionService,
    private readonly holdings: HoldingsService,
  ) {}

  private async refreshProjections(portfolioId: string): Promise<void> {
    await this.holdings.rebuild(portfolioId)
    await this.dividendProjection.rebuildFromTransactions(portfolioId)
  }

  async create(portfolioId: string, input: TransactionInput): Promise<Transaction> {
    const assetId = await this.resolveAssetId(
      input.assetId ?? null,
      input.symbol ?? null,
      input.currency,
      input.exchange ?? null,
      input.transactionType,
    )
    const created = await this.transactions.create(this.toWrite(portfolioId, input, assetId))
    await this.refreshProjections(portfolioId)
    return created
  }

  async createMany(
    portfolioId: string,
    inputs: readonly TransactionInput[],
  ): Promise<ImportResult> {
    if (inputs.length === 0) return { inserted: 0 }

    // Process position transactions first so cash events (dividends, taxes)
    // can attach to the instrument asset that already exists.
    const ordered = [...inputs].sort(
      (a, b) =>
        Number(isPositionTransaction(b.transactionType)) -
        Number(isPositionTransaction(a.transactionType)),
    )

    const assetCache = new Map<string, string | null>()
    const writes: TransactionWrite[] = []
    for (const input of ordered) {
      const assetId = await this.resolveCachedAsset(assetCache, input)
      writes.push(this.toWrite(portfolioId, input, assetId))
    }

    const inserted = await this.transactions.insertMany(writes)
    await this.refreshProjections(portfolioId)
    return { inserted }
  }

  private async resolveCachedAsset(
    cache: Map<string, string | null>,
    input: TransactionInput,
  ): Promise<string | null> {
    const kind = isPositionTransaction(input.transactionType) ? 'P' : 'C'
    const key = `${input.assetId ?? ''}|${input.symbol ?? ''}|${input.exchange ?? ''}|${input.currency}|${kind}`
    if (cache.has(key)) return cache.get(key) ?? null

    const assetId = await this.resolveAssetId(
      input.assetId ?? null,
      input.symbol ?? null,
      input.currency,
      input.exchange ?? null,
      input.transactionType,
    )
    cache.set(key, assetId)
    return assetId
  }

  async replaceAll(
    portfolioId: string,
    inputs: readonly TransactionInput[],
  ): Promise<ImportResult> {
    // A full replace clears derived dividend records so no stale seed or
    // previous-import data is shown alongside the new transactions.
    await this.dividendProjection.clear(portfolioId)
    await this.transactions.deleteByPortfolio(portfolioId)
    return this.createMany(portfolioId, inputs)
  }

  async update(
    portfolioId: string,
    id: string,
    input: TransactionUpdateInput,
  ): Promise<Transaction> {
    const existing = await this.transactions.findById(id)
    if (!existing || existing.portfolioId !== portfolioId) {
      throw new NotFoundError('Transaction', id)
    }

    const assetId =
      input.assetId !== undefined || input.symbol !== undefined
        ? await this.resolveAssetId(
            input.assetId ?? null,
            input.symbol ?? null,
            input.currency ?? existing.price.currency,
            input.exchange ?? null,
            input.transactionType ?? existing.transactionType,
          )
        : existing.assetId

    const updated = await this.transactions.update(id, {
      assetId,
      ...(input.transactionType ? { transactionType: input.transactionType } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.price !== undefined
        ? {
            priceMinor: fromMajor(
              input.price,
              input.currency ?? existing.price.currency,
            ).minorUnits,
          }
        : {}),
      ...(input.fees !== undefined
        ? {
            feesMinor: fromMajor(
              input.fees,
              input.currency ?? existing.price.currency,
            ).minorUnits,
          }
        : {}),
      ...(input.taxes !== undefined
        ? {
            taxesMinor: fromMajor(
              input.taxes,
              input.currency ?? existing.price.currency,
            ).minorUnits,
          }
        : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.exchangeRate !== undefined ? { exchangeRate: input.exchangeRate } : {}),
      ...(input.transactionDate ? { transactionDate: input.transactionDate } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
    })

    await this.refreshProjections(portfolioId)
    return updated
  }

  async remove(portfolioId: string, id: string): Promise<void> {
    const existing = await this.transactions.findById(id)
    if (!existing || existing.portfolioId !== portfolioId) {
      throw new NotFoundError('Transaction', id)
    }
    await this.transactions.delete(id)
    await this.refreshProjections(portfolioId)
  }

  private async resolveAssetId(
    assetId: string | null,
    symbol: string | null,
    currency: CurrencyCode,
    exchange: string | null,
    transactionType: string,
  ): Promise<string | null> {
    if (assetId) {
      const asset = await this.assets.findById(assetId)
      if (!asset) throw new NotFoundError('Asset', assetId)
      return asset.id
    }
    if (!symbol) return null

    if (isPositionTransaction(transactionType)) {
      const asset = await this.assets.findOrCreateAsset({ symbol, currency, exchange })
      return asset.id
    }

    // Cash events attach to an existing instrument when possible; otherwise
    // they remain unlinked rather than creating a synthetic asset.
    const existing = await this.assets.findBySymbol(symbol)
    return existing?.id ?? null
  }

  private toWrite(
    portfolioId: string,
    input: TransactionInput,
    assetId: string | null,
  ): TransactionWrite {
    return {
      portfolioId,
      assetId,
      transactionType: input.transactionType,
      quantity: input.quantity,
      priceMinor: fromMajor(input.price, input.currency).minorUnits,
      feesMinor: fromMajor(input.fees ?? 0, input.currency).minorUnits,
      taxesMinor: fromMajor(input.taxes ?? 0, input.currency).minorUnits,
      currency: input.currency,
      exchangeRate: input.exchangeRate ?? 1,
      transactionDate: input.transactionDate,
      notes: input.notes ?? null,
    }
  }
}
