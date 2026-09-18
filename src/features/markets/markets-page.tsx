import { SectionCard } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { MarketOverview } from '@/features/dashboard/components/market-overview'
import { useApiQuery } from '@/hooks/use-api-query'
import { api } from '@/lib/api-client'

export function MarketsPage() {
  const query = useApiQuery('markets', () => api.markets())

  return (
    <div className="space-y-4">
      <SectionCard
        title="Market overview"
        description="Indices, rates and commodities"
      >
        {query.isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : query.error ? (
          <ErrorState compact message={query.error.message} onRetry={query.refetch} />
        ) : (
          <MarketOverview
            quotes={query.data?.quotes ?? []}
            asOf={query.data?.asOf}
          />
        )}
      </SectionCard>

      <SectionCard title="Data source" description="Integration roadmap">
        <p className="text-sm text-muted">
          Market data currently comes from a mock provider that implements the
          <code className="mx-1 rounded bg-surface-hover px-1.5 py-0.5 text-xs">
            MarketDataProvider
          </code>
          port. A vendor such as Finnhub, Twelve Data, Alpha Vantage, Polygon or FMP can be
          plugged in without changing any component.
        </p>
      </SectionCard>
    </div>
  )
}
