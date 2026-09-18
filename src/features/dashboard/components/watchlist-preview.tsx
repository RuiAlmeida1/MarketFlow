import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { WatchlistDto } from '@shared/api/contracts'
import { buttonClasses } from '@/components/ui/button-classes'
import { ChangeIndicator } from '@/components/ui/change-indicator'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney } from '@/lib/format'

const MAX_PREVIEW_ITEMS = 6

export function WatchlistPreview({ watchlist }: { watchlist: WatchlistDto | null }) {
  if (!watchlist || watchlist.items.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title="Watchlist is empty"
        description="Track assets you are interested in to monitor prices and targets."
        action={
          <Link to="/watchlist" className={buttonClasses('secondary', 'sm')}>
            Go to watchlist
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-border">
        {watchlist.items.slice(0, MAX_PREVIEW_ITEMS).map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{item.asset.symbol}</p>
              <p className="truncate text-xs text-muted">{item.asset.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm tabular-nums text-foreground">
                  {item.lastPrice ? formatMoney(item.lastPrice) : '—'}
                </p>
                {item.dailyChange ? (
                  <ChangeIndicator percentage={item.dailyChange.percentage} />
                ) : null}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-[11px] text-subtle">Target</p>
                <p className="text-xs tabular-nums text-muted">
                  {item.targetPrice ? formatMoney(item.targetPrice) : '—'}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Link
        to="/watchlist"
        className={buttonClasses('secondary', 'sm', 'w-full')}
      >
        View watchlist
      </Link>
    </div>
  )
}
