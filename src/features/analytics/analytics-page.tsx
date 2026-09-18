import { ChartLine } from 'lucide-react'
import { useState } from 'react'
import {
  PERFORMANCE_PERIODS,
  PERFORMANCE_PERIOD_LABELS,
  type PerformancePeriod,
} from '@shared/api/contracts'
import type { AllocationDimension } from '@shared/domain'
import { ErrorBoundary } from '@/components/common/error-boundary'
import { SectionCard } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { AllocationChart } from '@/features/dashboard/components/allocation-chart'
import { PortfolioPerformanceChart } from '@/features/dashboard/components/portfolio-performance-chart'
import { TopHoldings } from '@/features/dashboard/components/top-holdings'
import { useApiQuery } from '@/hooks/use-api-query'
import { useSelectedPortfolio } from '@/hooks/use-selected-portfolio'
import { api } from '@/lib/api-client'
import { formatSignedPercentage, valueTone, toneTextClass } from '@/lib/format'
import { cn } from '@/lib/cn'

const PERIOD_OPTIONS = PERFORMANCE_PERIODS.map((period) => ({
  value: period,
  label: PERFORMANCE_PERIOD_LABELS[period],
}))

export function AnalyticsPage() {
  const { portfolio } = useSelectedPortfolio()
  const [period, setPeriod] = useState<PerformancePeriod>('1Y')
  const [dimension, setDimension] = useState<AllocationDimension>('sector')

  const performance = useApiQuery(
    portfolio ? `performance:${portfolio.id}:${period}` : null,
    () => api.performance(portfolio?.id ?? '', period),
  )
  const allocation = useApiQuery(
    portfolio ? `allocation:${portfolio.id}:${dimension}` : null,
    () => api.allocation(portfolio?.id ?? '', dimension),
  )
  const holdings = useApiQuery(portfolio ? `holdings:${portfolio.id}` : null, () =>
    api.holdings(portfolio?.id ?? ''),
  )

  return (
    <div className="space-y-4">
      <SectionCard
        title="Performance"
        description="Market value versus invested capital"
        action={
          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            ariaLabel="Performance period"
          />
        }
      >
        {performance.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : performance.error ? (
          <ErrorState
            compact
            message={performance.error.message}
            onRetry={performance.refetch}
          />
        ) : (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-muted">Period return</span>
              <span
                className={cn(
                  'font-medium tabular-nums',
                  toneTextClass(valueTone(performance.data?.performance.change.percentage ?? 0)),
                )}
              >
                {formatSignedPercentage(
                  performance.data?.performance.change.percentage ?? 0,
                )}
              </span>
            </div>
            <ErrorBoundary>
              <PortfolioPerformanceChart
                points={performance.data?.performance.points ?? []}
                baseCurrency={portfolio?.baseCurrency ?? 'EUR'}
              />
            </ErrorBoundary>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Allocation" description="Diversification breakdown">
          {allocation.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : allocation.error ? (
            <ErrorState compact message={allocation.error.message} onRetry={allocation.refetch} />
          ) : (
            <ErrorBoundary>
              <AllocationChart
                slices={allocation.data?.allocation.slices ?? []}
                dimension={dimension}
                onDimensionChange={setDimension}
                baseCurrency={portfolio?.baseCurrency ?? 'EUR'}
              />
            </ErrorBoundary>
          )}
        </SectionCard>

        <SectionCard title="Position weights" description="Contribution to portfolio value">
          {holdings.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : holdings.error ? (
            <ErrorState compact message={holdings.error.message} onRetry={holdings.refetch} />
          ) : (
            <ErrorBoundary>
              <TopHoldings holdings={holdings.data?.holdings ?? []} limit={10} />
            </ErrorBoundary>
          )}
        </SectionCard>
      </div>

      <p className="flex items-center gap-2 text-xs text-subtle">
        <ChartLine className="h-3.5 w-3.5" aria-hidden="true" />
        Time-weighted and money-weighted returns (TWR/XIRR) arrive in a later phase.
      </p>
    </div>
  )
}
