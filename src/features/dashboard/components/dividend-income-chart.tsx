import { Coins } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyDividendIncomeDto } from '@shared/api/contracts'
import type { CurrencyCode } from '@shared/domain'
import { toMajor } from '@shared/domain'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatMonthShort, formatNumber } from '@/lib/format'
import { TooltipRow, TooltipShell } from './chart-tooltip'
import type { ChartTooltipProps } from './chart-tooltip-types'
import { tooltipNumber } from './chart-tooltip-utils'

function DividendTooltip({
  active,
  payload,
  label,
  baseCurrency,
}: ChartTooltipProps & { baseCurrency: CurrencyCode }) {
  if (!active || !payload || payload.length === 0) return null
  const received = tooltipNumber(payload.find((entry) => entry.dataKey === 'received'))
  const projected = tooltipNumber(payload.find((entry) => entry.dataKey === 'projected'))
  return (
    <TooltipShell title={String(label ?? '')}>
      <TooltipRow
        label="Received"
        value={formatCurrency(received, baseCurrency)}
        color="var(--color-positive)"
      />
      <TooltipRow
        label="Projected"
        value={formatCurrency(projected, baseCurrency)}
        color="var(--color-accent)"
      />
      <TooltipRow
        label="Total"
        value={formatCurrency(received + projected, baseCurrency)}
        emphasize
      />
    </TooltipShell>
  )
}

export interface DividendIncomeChartProps {
  monthly: readonly MonthlyDividendIncomeDto[]
  baseCurrency: CurrencyCode
}

export function DividendIncomeChart({ monthly, baseCurrency }: DividendIncomeChartProps) {
  const hasData = monthly.some((month) => month.total.minorUnits > 0)
  if (!hasData) {
    return (
      <EmptyState
        icon={Coins}
        title="No dividend income"
        description="Dividend payments will be summarised here by month."
      />
    )
  }

  const data = monthly.map((month) => ({
    month: formatMonthShort(month.month),
    received: toMajor(month.received),
    projected: toMajor(month.projected),
  }))

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-positive" aria-hidden="true" /> Received
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" /> Projected
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--color-subtle)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value: number) =>
                formatNumber(value, { compact: true, maximumFractionDigits: 1 })
              }
              tick={{ fill: 'var(--color-subtle)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-hover)' }}
              content={<DividendTooltip baseCurrency={baseCurrency} />}
            />
            <Bar dataKey="received" name="Received" stackId="a" fill="var(--color-positive)" />
            <Bar
              dataKey="projected"
              name="Projected"
              stackId="a"
              fill="var(--color-accent)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
