import { z } from 'zod'
import { CURRENCY_CODES, TRANSACTION_TYPES } from '../../shared/domain'

// Types that must reference an asset. Cash transfers (TRANSFER_IN/OUT) may be
// asset-less money movements.
const ASSET_REQUIRED_TYPES = new Set(['BUY', 'SELL', 'DIVIDEND', 'SPLIT'])

// Types whose price must be a non-negative per-share amount. Everything else
// (cash events, including transfers) stores a signed amount and may be negative.
const NON_NEGATIVE_PRICE_TYPES = new Set(['BUY', 'SELL', 'SPLIT'])

const transactionFields = z.object({
  assetId: z.string().trim().min(1).max(128).nullish(),
  symbol: z.string().trim().min(1).max(32).nullish(),
  exchange: z.string().trim().max(32).nullish(),
  transactionType: z.enum(TRANSACTION_TYPES),
  quantity: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  /**
   * Price per share in major units for trades; a signed cash amount for cash
   * events (negative dividend = reversal, negative tax = withholding).
   */
  price: z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000),
  fees: z.number().finite().min(0).max(1_000_000_000).optional(),
  taxes: z.number().finite().min(0).max(1_000_000_000).optional(),
  currency: z.enum(CURRENCY_CODES),
  exchangeRate: z.number().finite().positive().max(1_000_000).optional(),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date.'),
  notes: z.string().max(500).nullish(),
})

export const transactionInputSchema = transactionFields.superRefine((value, ctx) => {
  if (
    ASSET_REQUIRED_TYPES.has(value.transactionType) &&
    !value.assetId &&
    !value.symbol
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['assetId'],
      message: 'An asset (assetId or symbol) is required for this transaction type.',
    })
  }
  if (NON_NEGATIVE_PRICE_TYPES.has(value.transactionType) && value.price < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['price'],
      message: 'Price cannot be negative for this transaction type.',
    })
  }
})

export const transactionUpdateSchema = transactionFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type TransactionInput = z.infer<typeof transactionInputSchema>
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>
