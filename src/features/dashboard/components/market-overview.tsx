import { ChartCandlestick } from 'lucide-react'
import type { MarketQuote } from '@shared/domain'
import { ChangeIndicator } from '@/components/ui/change-indicator'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime, formatNumber } from '@/lib/format'

export interface MarketOverviewProps {
  quotes: readonly MarketQuote[]
  asOf?: string
}

export function MarketOverview({ quotes, asOf }: MarketOverviewProps) {
  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={ChartCandlestick}
        title="Market data unavailable"
        description="Live market data will be connected in a later phase."
      />
    )
  }

  return (
    <div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quotes.map((quote) => (
          <li key={quote.symbol} className="rounded-lg border border-border p-3">
            <p className="truncate text-xs text-muted" title={quote.name}>
              {quote.name}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatNumber(quote.value, { maximumFractionDigits: 2 })}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-muted">
                {quote.change > 0 ? '+' : ''}
                {formatNumber(quote.change, { maximumFractionDigits: 2 })}
              </span>
              <ChangeIndicator percentage={quote.changePercentage} />
            </div>
          </li>
        ))}
      </ul>
      {asOf ? (
        <p className="mt-3 text-[11px] text-subtle">
          As of {formatDateTime(asOf, { dateStyle: 'medium', timeStyle: 'short' })} · development data
        </p>
      ) : null}
    </div>
  )
}
