import type { IncomeOverviewDto } from '@shared/api/contracts'
import { formatMoney } from '@/lib/format'

const ROWS = [
  { key: 'dividends', label: 'Dividends' },
  { key: 'realizedGains', label: 'Realized gains' },
  { key: 'interest', label: 'Interest' },
  { key: 'otherIncome', label: 'Other income' },
] as const

export function IncomeOverview({ income }: { income: IncomeOverviewDto }) {
  return (
    <dl className="space-y-3">
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between text-sm">
          <dt className="text-muted">{row.label}</dt>
          <dd className="tabular-nums text-foreground">{formatMoney(income[row.key])}</dd>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <dt className="font-medium text-foreground">Total income</dt>
        <dd className="font-semibold tabular-nums text-foreground">
          {formatMoney(income.total)}
        </dd>
      </div>
    </dl>
  )
}
