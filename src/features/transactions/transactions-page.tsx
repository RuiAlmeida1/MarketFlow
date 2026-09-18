import { ArrowLeftRight } from 'lucide-react'
import type { Asset, TransactionType } from '@shared/domain'
import { TRANSACTION_TYPE_LABELS } from '@shared/domain'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { SectionCard } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiQuery } from '@/hooks/use-api-query'
import { useSelectedPortfolio } from '@/hooks/use-selected-portfolio'
import { api } from '@/lib/api-client'
import { formatDate, formatMoney, formatQuantity } from '@/lib/format'

const TYPE_VARIANT: Record<TransactionType, BadgeVariant> = {
  BUY: 'accent',
  SELL: 'warning',
  DIVIDEND: 'positive',
  INTEREST: 'positive',
  TRANSFER_IN: 'neutral',
  DEPOSIT: 'positive',
  WITHDRAWAL: 'negative',
  FEE: 'negative',
  TAX: 'negative',
  SPLIT: 'neutral',
  TRANSFER_OUT: 'neutral',
  OTHER: 'neutral',
}

export function TransactionsPage() {
  const { portfolio, isLoading } = useSelectedPortfolio()
  const query = useApiQuery(portfolio ? `transactions:${portfolio.id}` : null, () =>
    api.transactions(portfolio?.id ?? ''),
  )

  const assetMap = new Map<string, Asset>(
    (query.data?.assets ?? []).map((asset) => [asset.id, asset]),
  )
  const transactions = query.data?.transactions ?? []

  return (
    <SectionCard title="Transactions" description="Source of truth for all positions">
      {isLoading || query.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : query.error ? (
        <ErrorState compact message={query.error.message} onRetry={query.refetch} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions yet"
          description="Transactions will appear here once recorded or imported."
        />
      ) : (
        <div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Transaction history</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th scope="col" className="pb-2 font-medium">Date</th>
                  <th scope="col" className="pb-2 font-medium">Type</th>
                  <th scope="col" className="pb-2 font-medium">Asset</th>
                  <th scope="col" className="pb-2 text-right font-medium">Quantity</th>
                  <th scope="col" className="pb-2 text-right font-medium">Price</th>
                  <th scope="col" className="pb-2 text-right font-medium">Fees</th>
                  <th scope="col" className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const asset = transaction.assetId
                    ? assetMap.get(transaction.assetId)
                    : null
                  return (
                    <tr
                      key={transaction.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2.5 whitespace-nowrap text-muted">
                        {formatDate(transaction.transactionDate, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-2.5">
                        <Badge variant={TYPE_VARIANT[transaction.transactionType]}>
                          {TRANSACTION_TYPE_LABELS[transaction.transactionType]}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        {asset ? (
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {asset.symbol}
                            </span>
                            <span className="max-w-[10rem] truncate text-xs text-muted">
                              {asset.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-foreground">
                        {formatQuantity(transaction.quantity)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-foreground">
                        {formatMoney(transaction.price)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted">
                        {formatMoney(transaction.fees)}
                      </td>
                      <td className="max-w-[12rem] truncate py-2.5 text-muted">
                        {transaction.notes ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {transactions.map((transaction) => {
              const asset = transaction.assetId ? assetMap.get(transaction.assetId) : null
              return (
                <li key={transaction.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {asset?.symbol ?? 'Cash movement'}
                    </span>
                    <Badge variant={TYPE_VARIANT[transaction.transactionType]}>
                      {TRANSACTION_TYPE_LABELS[transaction.transactionType]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>{formatDate(transaction.transactionDate, { dateStyle: 'medium' })}</span>
                    <span className="tabular-nums">
                      {formatQuantity(transaction.quantity)} @ {formatMoney(transaction.price)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}
