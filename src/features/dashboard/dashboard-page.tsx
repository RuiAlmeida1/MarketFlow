import { useState } from 'react'
import { ErrorBoundary } from '@/components/common/error-boundary'
import { SectionCard } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { api } from '@/lib/api-client'
import { AllocationChart } from './components/allocation-chart'
import { DashboardSkeleton } from './components/dashboard-skeleton'
import { DividendIncomeChart } from './components/dividend-income-chart'
import { IncomeOverview } from './components/income-overview'
import { MarketOverview } from './components/market-overview'
import { PerformanceHighlights } from './components/performance-highlights'
import { PortfolioHero } from './components/portfolio-hero'
import { PortfolioPerformanceChart } from './components/portfolio-performance-chart'
import { SummaryMetrics } from './components/summary-metrics'
import { TopHoldings } from './components/top-holdings'
import { UpcomingDividends } from './components/upcoming-dividends'
import { WatchlistPreview } from './components/watchlist-preview'
import { useDashboard } from './hooks/use-dashboard'

export function DashboardPage() {
  const {
    data,
    error,
    isLoading,
    refetch,
    period,
    setPeriod,
    dimension,
    setDimension,
  } = useDashboard()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (!data) return
    setRefreshing(true)
    try {
      await api.syncPortfolio(data.portfolio.id)
      refetch()
    } catch (caught) {
      console.error('[dashboard] sync failed', caught)
    } finally {
      setRefreshing(false)
    }
  }

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
        <ErrorState
          title="Unable to load your dashboard"
          message={error.message}
          onRetry={refetch}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
        <EmptyState
          title="No portfolio data"
          description="Create a portfolio or apply the development seed to get started."
        />
      </div>
    )
  }

  const baseCurrency = data.summary.baseCurrency

  return (
    <div className="space-y-4">
      <PortfolioHero
        summary={data.summary}
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <SummaryMetrics summary={data.summary} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          title="Portfolio performance"
          description="Market value vs invested capital"
          className="xl:col-span-2"
        >
          <ErrorBoundary>
            <PortfolioPerformanceChart
              points={data.performance.points}
              baseCurrency={baseCurrency}
            />
          </ErrorBoundary>
        </SectionCard>

        <SectionCard title="Allocation" description="Diversification breakdown">
          <ErrorBoundary>
            <AllocationChart
              slices={data.allocation.slices}
              dimension={dimension}
              onDimensionChange={setDimension}
              baseCurrency={baseCurrency}
            />
          </ErrorBoundary>
        </SectionCard>

        <SectionCard
          title="Dividend income"
          description={`Received and projected by month (${data.dividends.year})`}
          className="xl:col-span-2"
        >
          <ErrorBoundary>
            <DividendIncomeChart
              monthly={data.dividends.monthly}
              baseCurrency={baseCurrency}
            />
          </ErrorBoundary>
        </SectionCard>

        <SectionCard title="Income overview" description="Income by source this year">
          <ErrorBoundary>
            <IncomeOverview income={data.income} />
          </ErrorBoundary>
        </SectionCard>

        <SectionCard
          title="Top holdings"
          description="Largest positions by market value"
          className="xl:col-span-2"
        >
          <ErrorBoundary>
            <TopHoldings holdings={data.holdings} />
          </ErrorBoundary>
        </SectionCard>

        <SectionCard
          title="Performance highlights"
          description="Best and worst performers"
        >
          <ErrorBoundary>
            <PerformanceHighlights holdings={data.holdings} />
          </ErrorBoundary>
        </SectionCard>

        <SectionCard
          title="Upcoming dividends"
          description="Expected and confirmed payments"
          className="xl:col-span-2"
        >
          <ErrorBoundary>
            <UpcomingDividends items={data.dividends.upcoming} />
          </ErrorBoundary>
        </SectionCard>

        <SectionCard
          title={data.watchlist ? `Watchlist · ${data.watchlist.name}` : 'Watchlist'}
          description="Tracked assets and targets"
        >
          <ErrorBoundary>
            <WatchlistPreview watchlist={data.watchlist} />
          </ErrorBoundary>
        </SectionCard>

        <SectionCard
          title="Market overview"
          description="Indices, rates and commodities"
          className="xl:col-span-3"
        >
          <ErrorBoundary>
            <MarketOverview quotes={data.markets} asOf={data.generatedAt} />
          </ErrorBoundary>
        </SectionCard>
      </div>
    </div>
  )
}
