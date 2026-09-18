import { projectDividendPayments } from '../../shared/domain'
import type { DividendRepository } from '../repositories/dividend-repository'
import type { TransactionRepository } from '../repositories/transaction-repository'

const MAX_TRANSACTIONS = 10_000

/**
 * Projects `dividend_payments` from DIVIDEND/TAX transactions. Like holdings,
 * dividend payments are derived data reconstructed from the transaction log.
 */
export class DividendProjectionService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly dividends: DividendRepository,
  ) {}

  async clear(portfolioId: string): Promise<void> {
    await this.dividends.deleteByPortfolio(portfolioId)
  }

  async rebuildFromTransactions(portfolioId: string): Promise<number> {
    const transactions = await this.transactions.listByPortfolio(
      portfolioId,
      MAX_TRANSACTIONS,
    )
    const payments = projectDividendPayments(transactions)
    if (payments.length === 0) return 0

    await this.dividends.replaceAll(
      portfolioId,
      payments.map((payment) => ({
        assetId: payment.assetId,
        amountGrossMinor: payment.amountGross.minorUnits,
        taxAmountMinor: payment.taxAmount.minorUnits,
        amountNetMinor: payment.amountNet.minorUnits,
        currency: payment.currency,
        date: payment.date,
      })),
    )
    return payments.length
  }
}
