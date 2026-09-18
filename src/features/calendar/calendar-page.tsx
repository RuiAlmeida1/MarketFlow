import { CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import type { UpcomingDividendDto } from '@shared/api/contracts'
import { SectionCard } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { UpcomingDividends } from '@/features/dashboard/components/upcoming-dividends'
import { useApiQuery } from '@/hooks/use-api-query'
import { useSelectedPortfolio } from '@/hooks/use-selected-portfolio'
import { api } from '@/lib/api-client'
import { formatDate } from '@/lib/format'

export function CalendarPage() {
  const { portfolio } = useSelectedPortfolio()
  const query = useApiQuery(portfolio ? `dividends:${portfolio.id}` : null, () =>
    api.dividends(portfolio?.id ?? ''),
  )

  const groups = useMemo(() => {
    const map = new Map<string, UpcomingDividendDto[]>()
    for (const item of query.data?.dividends.upcoming ?? []) {
      const date = item.paymentDate ?? item.exDate
      const key = date.slice(0, 7)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [query.data])

  if (query.isLoading) {
    return (
      <SectionCard title="Dividend calendar">
        <Skeleton className="h-56 w-full" />
      </SectionCard>
    )
  }

  if (query.error) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
        <EmptyState
          icon={CalendarDays}
          title="No scheduled payments"
          description="Expected dividend dates will appear here."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map(([monthKey, items]) => (
        <SectionCard
          key={monthKey}
          title={formatDate(`${monthKey}-01`, { dateStyle: 'long' })}
          description={`${items.length} payment${items.length === 1 ? '' : 's'}`}
        >
          <UpcomingDividends items={items} />
        </SectionCard>
      ))}
    </div>
  )
}
