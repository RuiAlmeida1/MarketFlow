import { type Money, projectPortfolio } from '../../shared/domain'
import type { HoldingRepository } from '../repositories/holding-repository'
import type { TransactionRepository } from '../repositories/transaction-repository'

export interface HoldingsRebuildResult {
  readonly positions: number
  readonly realizedGains: readonly Money[]
}

const MAX_TRANSACTIONS = 10_000

/**
 * Rebuilds `portfolio_holdings` from the transaction log. Transactions are the
 * source of truth; holdings are always a derived projection.
 */
export class HoldingsService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly holdings: HoldingRepository,
  ) {}

  async rebuild(portfolioId: string): Promise<HoldingsRebuildResult> {
    const transactions = await this.transactions.listByPortfolio(
      portfolioId,
      MAX_TRANSACTIONS,
    )
    const projection = projectPortfolio(transactions)

    await this.holdings.replaceAll(
      portfolioId,
      projection.holdings.map((holding) => ({
        assetId: holding.assetId,
        quantity: holding.quantity,
        averageCostMinor: holding.averageCostPerShare?.minorUnits ?? 0,
        totalCostMinor: holding.totalCost.minorUnits,
        currency: holding.currency,
      })),
    )

    return {
      positions: projection.holdings.filter((holding) => holding.quantity !== 0).length,
      realizedGains: projection.realizedGains,
    }
  }
}
