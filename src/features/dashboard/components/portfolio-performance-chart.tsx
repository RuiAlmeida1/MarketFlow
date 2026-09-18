import { ChartLine } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PerformancePointDto } from '@shared/api/contracts'
import type { CurrencyCode } from '@shared/domain'
import { toMajor } from '@shared/domain'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, formatNumber, formatPercentage } from '@/lib/format'
import { TooltipRow, TooltipShell } from './chart-tooltip'
import type { ChartTooltipProps } from './chart-tooltip-types'
import { tooltipNumber } from './chart-tooltip-utils'

function PerformanceTooltip({
  active,
  payload,
  label,
  baseCurrency,
}: ChartTooltipProps & { baseCurrency: CurrencyCode }) {
  if (!active || !payload || payload.length === 0) return null
  const value = tooltipNumber(payload.find((entry) => entry.dataKey === 'portfolioValue'))
  const cost = tooltipNumber(payload.find((entry) => entry.dataKey === 'investedCapital'))
  const absolute = value - cost
  const percentage = cost === 0 ? 0 : (absolute / Math.abs(cost)) * 100

  return (
    <TooltipShell
      title={label ? formatDate(String(label), { dateStyle: 'medium' }) : undefined}
    >
      <TooltipRow label="Portfolio value" value={formatCurrency(value, baseCurrency)} />
      <TooltipRow label="Invested capital" value={formatCurrency(cost, baseCurrency)} />
      <TooltipRow
        label="Return"
        value={`${formatCurrency(absolute, baseCurrency)} (${formatPercentage(percentage)})`}
        emphasize
      />
    </TooltipShell>
  )
}

export interface PortfolioPerformanceChartProps {
  points: readonly PerformancePointDto[]
  baseCurrency: CurrencyCode
}

export function PortfolioPerformanceChart({
  points,
  baseCurrency,
}: PortfolioPerformanceChartProps) {
  if (points.length < 2) {
    return (
      <EmptyState
        icon={ChartLine}
        title="No performance history yet"
        description="Historical snapshots will appear here once the portfolio has data over time."
      />
    )
  }

  const data = points.map((point) => ({
    date: point.date,
    portfolioValue: toMajor(point.portfolioValue),
    investedCapital: toMajor(point.investedCapital),
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="mf-performance-value" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="4 4" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value, { dateStyle: 'short' })}
            tick={{ fill: 'var(--color-subtle)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(value: number) =>
              formatNumber(value, { compact: true, maximumFractionDigits: 1 })
            }
            tick={{ fill: 'var(--color-subtle)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<PerformanceTooltip baseCurrency={baseCurrency} />} />
          <Area
            type="monotone"
            dataKey="portfolioValue"
            name="Portfolio value"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="url(#mf-performance-value)"
          />
          <Area
            type="monotone"
            dataKey="investedCapital"
            name="Invested capital"
            stroke="var(--color-subtle)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
