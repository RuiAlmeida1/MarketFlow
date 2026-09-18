import { ChartPie } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  ALLOCATION_DIMENSION_LABELS,
  ALLOCATION_DIMENSIONS,
  type AllocationDimension,
  type AllocationSlice,
  type CurrencyCode,
} from '@shared/domain'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { formatCurrency, formatMoney, formatPercentage } from '@/lib/format'
import { chartColor } from '../chart-colors'
import { TooltipRow, TooltipShell } from './chart-tooltip'
import type { ChartTooltipProps } from './chart-tooltip-types'

interface AllocationDatum {
  name: string
  label: string
  value: number
  weight: number
}

function AllocationTooltip({
  active,
  payload,
  baseCurrency,
}: ChartTooltipProps & { baseCurrency: CurrencyCode }) {
  const datum = payload?.[0]?.payload as AllocationDatum | undefined
  if (!active || !datum) return null
  return (
    <TooltipShell title={datum.label}>
      <TooltipRow label="Value" value={formatCurrency(datum.value, baseCurrency)} />
      <TooltipRow label="Weight" value={formatPercentage(datum.weight)} emphasize />
    </TooltipShell>
  )
}

export interface AllocationChartProps {
  slices: readonly AllocationSlice[]
  dimension: AllocationDimension
  onDimensionChange: (dimension: AllocationDimension) => void
  baseCurrency: CurrencyCode
}

export function AllocationChart({
  slices,
  dimension,
  onDimensionChange,
  baseCurrency,
}: AllocationChartProps) {
  const options = ALLOCATION_DIMENSIONS.map((value) => ({
    value,
    label: ALLOCATION_DIMENSION_LABELS[value],
  }))

  const data: AllocationDatum[] = slices.map((slice) => ({
    name: slice.label,
    label: slice.label,
    value: Number((slice.value.minorUnits / 100).toFixed(2)),
    weight: slice.weight,
  }))

  return (
    <div>
      <div className="mb-4">
        <SegmentedControl
          options={options}
          value={dimension}
          onChange={onDimensionChange}
          ariaLabel="Allocation dimension"
        />
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={ChartPie}
          title="No allocation data"
          description="Add holdings to see how your portfolio is diversified."
        />
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={54}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.label} fill={chartColor(index)} />
                  ))}
                </Pie>
                <Tooltip content={<AllocationTooltip baseCurrency={baseCurrency} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="w-full space-y-2">
            {slices.map((slice, index) => (
              <li
                key={slice.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: chartColor(index) }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-foreground">{slice.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3 tabular-nums">
                  <span className="text-muted">{formatMoney(slice.value)}</span>
                  <span className="w-14 text-right font-medium text-foreground">
                    {formatPercentage(slice.weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
