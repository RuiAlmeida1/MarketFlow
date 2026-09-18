import { SearchX, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button-classes'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiQuery } from '@/hooks/use-api-query'
import { api } from '@/lib/api-client'
import { ASSET_TYPE_LABELS } from '@shared/domain'

export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() ?? ''
  const result = useApiQuery(query ? `search:${query}` : null, () =>
    api.searchAssets(query),
  )
  const assets = result.data?.assets ?? []

  if (!query) {
    return (
      <EmptyState
        icon={Search}
        title="Search for an asset"
        description="Use the search box in the header to find instruments by ticker or name."
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Results for <span className="font-medium text-foreground">“{query}”</span>
      </p>

      {result.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : result.error ? (
        <ErrorState compact message={result.error.message} onRetry={result.refetch} />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No assets found"
          description="Try a different ticker or company name."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 surface-shadow"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{asset.symbol}</p>
                <p className="truncate text-xs text-muted">{asset.name}</p>
                <p className="mt-1 flex items-center gap-2">
                  <Badge variant="neutral">{ASSET_TYPE_LABELS[asset.assetType]}</Badge>
                  <span className="text-[11px] text-subtle">
                    {asset.exchange ?? 'OTC'} · {asset.currency}
                  </span>
                </p>
              </div>
              <Link
                to="/watchlist"
                className={buttonClasses('secondary', 'sm', 'shrink-0')}
              >
                Watchlist
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
