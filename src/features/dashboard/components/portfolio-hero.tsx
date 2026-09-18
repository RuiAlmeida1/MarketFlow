import {
  PERFORMANCE_PERIODS,
  PERFORMANCE_PERIOD_LABELS,
  type PerformancePeriod,
  type PortfolioSummaryDto,
} from '@shared/api/contracts'
import { ChangeIndicator } from '@/components/ui/change-indicator'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { cn } from '@/lib/cn'
import {
  formatMoney,
  formatSignedMoney,
  formatSignedPercentage,
  toneTextClass,
  valueTone,
} from '@/lib/format'

const PERIOD_OPTIONS = PERFORMANCE_PERIODS.map((period) => ({
  value: period,
  label: PERFORMANCE_PERIOD_LABELS[period],
}))

export interface PortfolioHeroProps {
  summary: PortfolioSummaryDto
  period: PerformancePeriod
  onPeriodChange: (period: PerformancePeriod) => void
}

export function PortfolioHero({ summary, period, onPeriodChange }: PortfolioHeroProps) {
  const returnTone = valueTone(summary.unrealizedReturnPercentage)

  return (
    <section
      aria-label="Portfolio overview"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 surface-shadow sm:p-6"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">Portfolio value</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
            {formatMoney(summary.marketValue)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <ChangeIndicator
              percentage={summary.dailyChange.percentage}
              absolute={summary.dailyChange.absolute}
              showAbsolute
              size="md"
            />
            <span className="text-xs text-subtle">today</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 lg:items-end">
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <dt className="text-xs text-muted">Invested</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                {formatMoney(summary.investedCapital)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total return</dt>
              <dd
                className={cn(
                  'mt-0.5 text-sm font-medium tabular-nums',
                  toneTextClass(returnTone),
                )}
              >
                {formatSignedMoney(summary.unrealizedReturn)} ·{' '}
                {formatSignedPercentage(summary.unrealizedReturnPercentage)}
              </dd>
            </div>
          </dl>
          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={onPeriodChange}
            ariaLabel="Performance period"
            size="md"
          />
        </div>
      </div>
    </section>
  )
}
