import type { CurrencyCode } from '../money/currency'
import { type Money, addMoney, subtractMoney, zero } from '../money/money'
import type { Transaction } from '../transactions/transaction'

/**
 * A dividend payment derived from the transaction log. XTB records a gross
 * `DIVIDEND` and its `TAX` on the same instrument/date; they are paired here.
 */
export interface ProjectedDividendPayment {
  readonly assetId: string
  readonly amountGross: Money
  readonly taxAmount: Money
  readonly amountNet: Money
  readonly currency: CurrencyCode
  readonly date: string
}

/**
 * Derives dividend payments from DIVIDEND/TAX transactions, grouped per
 * (asset, date). Transactions are the source of truth; `dividend_payments` is a
 * projection of them.
 */
export function projectDividendPayments(
  transactions: readonly Transaction[],
): ProjectedDividendPayment[] {
  const groups = new Map<
    string,
    { assetId: string; date: string; currency: CurrencyCode; gross: Money; tax: Money }
  >()

  for (const transaction of transactions) {
    if (!transaction.assetId) continue
    if (transaction.transactionType !== 'DIVIDEND' && transaction.transactionType !== 'TAX') {
      continue
    }

    const currency = transaction.price.currency
    const key = `${transaction.assetId}|${transaction.transactionDate}|${currency}`
    const group =
      groups.get(key) ??
      {
        assetId: transaction.assetId,
        date: transaction.transactionDate,
        currency,
        gross: zero(currency),
        tax: zero(currency),
      }

    if (transaction.transactionType === 'DIVIDEND') {
      group.gross = addMoney(group.gross, transaction.price)
    } else {
      group.tax = addMoney(group.tax, transaction.price)
    }
    groups.set(key, group)
  }

  return [...groups.values()]
    .filter((group) => group.gross.minorUnits !== 0 || group.tax.minorUnits !== 0)
    .map((group) => ({
      assetId: group.assetId,
      amountGross: group.gross,
      taxAmount: group.tax,
      amountNet: subtractMoney(group.gross, group.tax),
      currency: group.currency,
      date: group.date,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
