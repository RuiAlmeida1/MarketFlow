import { Coins, Percent, TrendingUp } from 'lucide-react'
import { ErrorBoundary } from '@/components/common/error-boundary'
import { SectionCard } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { MetricCard } from '@/components/ui/metric-card'
import { Skeleton } from '@/components/ui/skeleton'
import { DividendIncomeChart } from '@/features/dashboard/components/dividend-income-chart'
import { UpcomingDividends } from '@/features/dashboard/components/upcoming-dividends'
import { useApiQuery } from '@/hooks/use-api-query'
import { useSelectedPortfolio } from '@/hooks/use-selected-portfolio'
import { api } from '@/lib/api-client'
import { formatMoney } from '@/lib/format'

export function DividendsPage() {
  const { portfolio, isLoading } = useSelectedPortfolio()
  const query = useApiQuery(portfolio ? `dividends:${portfolio.id}` : null, () =>
    api.dividends(portfolio?.id ?? ''),
  )

  const dividends = query.data?.dividends

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Annual income"
          value={dividends ? formatMoney(dividends.annualIncome) : '—'}
          icon={Coins}
          hint={dividends ? `Forecast for ${dividends.year}` : undefined}
        />
        <MetricCard
          label="Received"
          value={dividends ? formatMoney(dividends.receivedIncome) : '—'}
          icon={TrendingUp}
          hint="Confirmed and paid"
        />
        <MetricCard
          label="Projected"
          value={dividends ? formatMoney(dividends.projectedIncome) : '—'}
          icon={Percent}
          hint="Expected and confirmed"
        />
      </div>

      <SectionCard
        title="Dividend income"
        description={
          dividends ? `Monthly received vs projected · ${dividends.year}` : undefined
        }
      >
        {isLoading || query.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : query.error ? (
          <ErrorState compact message={query.error.message} onRetry={query.refetch} />
        ) : dividends ? (
          <ErrorBoundary>
            <DividendIncomeChart
              monthly={dividends.monthly}
              baseCurrency={dividends.annualIncome.currency}
            />
          </ErrorBoundary>
        ) : null}
      </SectionCard>

      <SectionCard title="Upcoming dividends" description="Expected and confirmed payments">
        {dividends ? (
          <ErrorBoundary>
            <UpcomingDividends items={dividends.upcoming} />
          </ErrorBoundary>
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </SectionCard>
    </div>
  )
}
