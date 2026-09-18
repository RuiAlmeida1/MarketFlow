import { Eye } from 'lucide-react'
import type { WatchlistDto } from '@shared/api/contracts'
import { Badge } from '@/components/ui/badge'
import { SectionCard } from '@/components/ui/card'
import { ChangeIndicator } from '@/components/ui/change-indicator'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiQuery } from '@/hooks/use-api-query'
import { api } from '@/lib/api-client'
import { formatMoney } from '@/lib/format'

function WatchlistTable({ watchlist }: { watchlist: WatchlistDto }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{watchlist.name} watchlist items</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th scope="col" className="pb-2 font-medium">Ticker</th>
            <th scope="col" className="pb-2 font-medium">Company</th>
            <th scope="col" className="pb-2 text-right font-medium">Price</th>
            <th scope="col" className="pb-2 text-right font-medium">Day</th>
            <th scope="col" className="pb-2 text-right font-medium">Target</th>
            <th scope="col" className="pb-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {watchlist.items.map((item) => (
            <tr key={item.id} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 font-medium text-foreground">{item.asset.symbol}</td>
              <td className="max-w-[14rem] truncate py-2.5 text-muted">
                {item.asset.name}
              </td>
              <td className="py-2.5 text-right tabular-nums text-foreground">
                {item.lastPrice ? formatMoney(item.lastPrice) : '—'}
              </td>
              <td className="py-2.5 text-right">
                {item.dailyChange ? (
                  <ChangeIndicator percentage={item.dailyChange.percentage} />
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums text-muted">
                {item.targetPrice ? formatMoney(item.targetPrice) : '—'}
              </td>
              <td className="max-w-[12rem] truncate py-2.5 text-muted">
                {item.notes ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WatchlistPage() {
  const query = useApiQuery('watchlists', () => api.watchlists())
  const watchlists = query.data?.watchlists ?? []

  return (
    <div className="space-y-4">
      {query.isLoading ? (
        <SectionCard title="Watchlists">
          <Skeleton className="h-40 w-full" />
        </SectionCard>
      ) : query.error ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
          <ErrorState message={query.error.message} onRetry={query.refetch} />
        </div>
      ) : watchlists.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
          <EmptyState
            icon={Eye}
            title="No watchlists yet"
            description="Create a watchlist to monitor assets and target prices."
          />
        </div>
      ) : (
        watchlists.map((watchlist) => (
          <SectionCard
            key={watchlist.id}
            title={watchlist.name}
            description={`${watchlist.items.length} tracked asset${watchlist.items.length === 1 ? '' : 's'}`}
            action={watchlist.isDefault ? <Badge variant="accent">Default</Badge> : undefined}
          >
            {watchlist.items.length === 0 ? (
              <EmptyState title="This watchlist is empty" />
            ) : (
              <WatchlistTable watchlist={watchlist} />
            )}
          </SectionCard>
        ))
      )}
    </div>
  )
}
