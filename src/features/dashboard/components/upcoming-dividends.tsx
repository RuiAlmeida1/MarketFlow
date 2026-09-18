import { CalendarClock } from 'lucide-react'
import type { UpcomingDividendDto } from '@shared/api/contracts'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, formatMoney, formatQuantity } from '@/lib/format'

function StatusBadge({ status }: { status: UpcomingDividendDto['status'] }) {
  const variant =
    status === 'CONFIRMED' ? 'accent' : status === 'RECEIVED' ? 'positive' : 'neutral'
  return <Badge variant={variant}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>
}

export interface UpcomingDividendsProps {
  items: readonly UpcomingDividendDto[]
}

export function UpcomingDividends({ items }: UpcomingDividendsProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No upcoming dividends"
        description="Expected and confirmed dividend payments will be listed here."
      />
    )
  }

  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Upcoming dividend payments</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th scope="col" className="pb-2 font-medium">
                Company
              </th>
              <th scope="col" className="pb-2 font-medium">
                Ex-date
              </th>
              <th scope="col" className="pb-2 font-medium">
                Payment
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Shares
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Div / share
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Est. income
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{item.asset.symbol}</span>
                    <span className="max-w-[12rem] truncate text-muted">
                      {item.asset.name}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 text-muted">
                  {formatDate(item.exDate, { dateStyle: 'medium' })}
                </td>
                <td className="py-2.5">
                  <span className="text-muted">
                    {item.paymentDate
                      ? formatDate(item.paymentDate, { dateStyle: 'medium' })
                      : '—'}
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-foreground">
                  {formatQuantity(item.shares)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-foreground">
                  {formatMoney(item.dividendPerShare)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums text-foreground">
                  {formatMoney(item.estimatedIncome)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.asset.symbol}</p>
                <p className="truncate text-xs text-muted">{item.asset.name}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-subtle">Ex-date</dt>
                <dd className="text-foreground">
                  {formatDate(item.exDate, { dateStyle: 'medium' })}
                </dd>
              </div>
              <div>
                <dt className="text-subtle">Payment</dt>
                <dd className="text-foreground">
                  {item.paymentDate
                    ? formatDate(item.paymentDate, { dateStyle: 'medium' })
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-subtle">Shares</dt>
                <dd className="text-foreground">{formatQuantity(item.shares)}</dd>
              </div>
              <div>
                <dt className="text-subtle">Est. income</dt>
                <dd className="font-medium text-foreground">
                  {formatMoney(item.estimatedIncome)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}

