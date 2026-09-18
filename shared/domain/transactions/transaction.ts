import type { CurrencyCode } from '../money/currency'
import type { Money } from '../money/money'

export const TRANSACTION_TYPES = [
  'BUY',
  'SELL',
  'DIVIDEND',
  'DEPOSIT',
  'WITHDRAWAL',
  'FEE',
  'INTEREST',
  'TAX',
  'SPLIT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'OTHER',
] as const

export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: 'Buy',
  SELL: 'Sell',
  DIVIDEND: 'Dividend',
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  FEE: 'Fee',
  INTEREST: 'Interest',
  TAX: 'Tax',
  SPLIT: 'Split',
  TRANSFER_IN: 'Transfer in',
  TRANSFER_OUT: 'Transfer out',
  OTHER: 'Other',
}

export type CashFlowDirection = 'in' | 'out' | 'neutral'

/**
 * Direction of cash for each transaction type. Used by income/cash reports so
 * the mapping lives in the domain and not in the UI.
 */
export const CASH_FLOW_DIRECTION: Record<TransactionType, CashFlowDirection> = {
  BUY: 'out',
  SELL: 'in',
  DIVIDEND: 'in',
  DEPOSIT: 'in',
  WITHDRAWAL: 'out',
  FEE: 'out',
  INTEREST: 'in',
  TAX: 'out',
  SPLIT: 'neutral',
  TRANSFER_IN: 'neutral',
  TRANSFER_OUT: 'neutral',
  OTHER: 'neutral',
}

export function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === 'string' && (TRANSACTION_TYPES as readonly string[]).includes(value)
}

export interface Transaction {
  readonly id: string
  readonly portfolioId: string
  readonly assetId: string | null
  readonly transactionType: TransactionType
  readonly quantity: number
  readonly price: Money
  readonly fees: Money
  readonly taxes: Money
  readonly exchangeRate: number
  readonly transactionDate: string
  readonly notes: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export function transactionCurrency(transaction: Transaction): CurrencyCode {
  return transaction.price.currency
}
