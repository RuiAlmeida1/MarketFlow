import { Briefcase } from 'lucide-react'
import { useState } from 'react'
import { ErrorBoundary } from '@/components/common/error-boundary'
import { SectionCard } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { AllocationChart } from '@/features/dashboard/components/allocation-chart'
import { TopHoldings } from '@/features/dashboard/components/top-holdings'
import { useApiQuery } from '@/hooks/use-api-query'
import { useSelectedPortfolio } from '@/hooks/use-selected-portfolio'
import { api } from '@/lib/api-client'
import type { AllocationDimension } from '@shared/domain'

export function PortfolioPage() {
  const { portfolio, isLoading, error, refetch } = useSelectedPortfolio()
  const [dimension, setDimension] = useState<AllocationDimension>('sector')

  const holdings = useApiQuery(portfolio ? `holdings:${portfolio.id}` : null, () =>
    api.holdings(portfolio?.id ?? ''),
  )
  const allocation = useApiQuery(
    portfolio ? `allocation:${portfolio.id}:${dimension}` : null,
    () => api.allocation(portfolio?.id ?? '', dimension),
  )

  if (isLoading) {
    return (
      <SectionCard title="Holdings" description="Loading portfolio…">
        <Skeleton className="h-40 w-full" />
      </SectionCard>
    )
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
        <ErrorState message={error.message} onRetry={refetch} />
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
        <EmptyState
          icon={Briefcase}
          title="No portfolio found"
          description="Apply the development seed or create a portfolio to get started."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 surface-shadow">
        <h2 className="text-lg font-semibold text-foreground">{portfolio.name}</h2>
        {portfolio.description ? (
          <p className="mt-0.5 text-sm text-muted">{portfolio.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-subtle">
          Base currency {portfolio.baseCurrency} · {portfolio.isDefault ? 'Default portfolio' : 'Secondary portfolio'}
        </p>
      </div>

      <SectionCard title="Holdings" description="All open positions">
        {holdings.error ? (
          <ErrorState compact message={holdings.error.message} onRetry={holdings.refetch} />
        ) : holdings.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ErrorBoundary>
            <TopHoldings holdings={holdings.data?.holdings ?? []} limit={100} />
          </ErrorBoundary>
        )}
      </SectionCard>

      <SectionCard title="Allocation" description="Breakdown by dimension">
        {allocation.error ? (
          <ErrorState
            compact
            message={allocation.error.message}
            onRetry={allocation.refetch}
          />
        ) : allocation.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ErrorBoundary>
            <AllocationChart
              slices={allocation.data?.allocation.slices ?? []}
              dimension={dimension}
              onDimensionChange={setDimension}
              baseCurrency={portfolio.baseCurrency}
            />
          </ErrorBoundary>
        )}
      </SectionCard>
    </div>
  )
}
