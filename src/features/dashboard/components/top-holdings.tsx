import { Briefcase } from 'lucide-react'
import type { HoldingDto } from '@shared/api/contracts'
import { ChangeIndicator } from '@/components/ui/change-indicator'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney, formatPercentage, formatQuantity } from '@/lib/format'

function WeightBar({ weight }: { weight: number }) {
  const width = Math.max(0, Math.min(100, weight))
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="w-14 text-right tabular-nums text-foreground">
        {formatPercentage(weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </span>
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-hover lg:block">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${width}%` }}
          aria-hidden="true"
        />
      </span>
    </div>
  )
}

export interface TopHoldingsProps {
  holdings: readonly HoldingDto[]
  limit?: number
}

export function TopHoldings({ holdings, limit = 8 }: TopHoldingsProps) {
  if (holdings.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No holdings yet"
        description="Add transactions or import a portfolio to see your positions here."
      />
    )
  }

  const rows = holdings.slice(0, limit)

  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Top holdings by market value</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th scope="col" className="pb-2 font-medium">
                Ticker
              </th>
              <th scope="col" className="pb-2 font-medium">
                Company
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Weight
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Value
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Avg cost
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Price
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Return
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((holding) => (
              <tr
                key={holding.asset.id}
                className="border-b border-border/60 last:border-0"
              >
                <td className="py-2.5 font-medium text-foreground">
                  {holding.asset.symbol}
                </td>
                <td className="max-w-[14rem] truncate py-2.5 text-muted">
                  {holding.asset.name}
                </td>
                <td className="py-2.5">
                  <WeightBar weight={holding.weight} />
                </td>
                <td className="py-2.5 text-right tabular-nums text-foreground">
                  {formatMoney(holding.marketValue)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-muted">
                  {holding.averageCostPerShare
                    ? formatMoney(holding.averageCostPerShare)
                    : '—'}
                </td>
                <td className="py-2.5 text-right tabular-nums text-muted">
                  {holding.lastPrice ? formatMoney(holding.lastPrice) : '—'}
                </td>
                <td className="py-2.5">
                  <div className="flex justify-end">
                    <ChangeIndicator
                      percentage={holding.returnPercentage}
                      absolute={holding.absoluteReturn}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((holding) => (
          <li
            key={holding.asset.id}
            className="rounded-lg border border-border p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {holding.asset.symbol}
                </p>
                <p className="truncate text-xs text-muted">{holding.asset.name}</p>
              </div>
              <ChangeIndicator percentage={holding.returnPercentage} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-subtle">Value</dt>
                <dd className="tabular-nums text-foreground">
                  {formatMoney(holding.marketValue)}
                </dd>
              </div>
              <div>
                <dt className="text-subtle">Shares</dt>
                <dd className="tabular-nums text-foreground">
                  {formatQuantity(holding.quantity)}
                </dd>
              </div>
              <div>
                <dt className="text-subtle">Weight</dt>
                <dd className="tabular-nums text-foreground">
                  {formatPercentage(holding.weight, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}
