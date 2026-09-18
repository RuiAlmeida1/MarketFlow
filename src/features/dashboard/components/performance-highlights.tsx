import { TrendingDown, TrendingUp } from 'lucide-react'
import type { HoldingDto } from '@shared/api/contracts'
import type { Asset, Money } from '@shared/domain'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/cn'
import {
  formatSignedMoney,
  formatSignedPercentage,
  toneTextClass,
  valueTone,
} from '@/lib/format'

export interface PerformanceHighlightCardProps {
  asset: Asset
  returnPercentage: number
  absoluteReturn: Money
  variant: 'best' | 'worst'
}

/** Single reusable card for both best and worst performers. */
export function PerformanceHighlightCard({
  asset,
  returnPercentage,
  absoluteReturn,
  variant,
}: PerformanceHighlightCardProps) {
  const isBest = variant === 'best'
  const Icon = isBest ? TrendingUp : TrendingDown

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-[var(--radius-card)] border p-4',
        isBest
          ? 'border-positive/30 bg-positive-soft/60'
          : 'border-negative/30 bg-negative-soft/60',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            isBest ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-negative',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {asset.symbol}
          </p>
          <p className="truncate text-xs text-muted">{asset.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            toneTextClass(valueTone(returnPercentage)),
          )}
        >
          {formatSignedPercentage(returnPercentage)}
        </p>
        <p className="text-xs tabular-nums text-muted">
          {formatSignedMoney(absoluteReturn)}
        </p>
      </div>
    </div>
  )
}

export function PerformanceHighlights({ holdings }: { holdings: readonly HoldingDto[] }) {
  const eligible = holdings.filter(
    (holding) => holding.cost.minorUnits !== 0 && holding.lastPrice !== null,
  )

  if (eligible.length === 0) {
    return (
      <EmptyState
        title="No performance data"
        description="Once positions have prices and a cost basis, the best and worst performers appear here."
      />
    )
  }

  const sorted = [...eligible].sort((a, b) => b.returnPercentage - a.returnPercentage)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  if (!best || !worst) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <PerformanceHighlightCard
        asset={best.asset}
        returnPercentage={best.returnPercentage}
        absoluteReturn={best.absoluteReturn}
        variant="best"
      />
      <PerformanceHighlightCard
        asset={worst.asset}
        returnPercentage={worst.returnPercentage}
        absoluteReturn={worst.absoluteReturn}
        variant="worst"
      />
    </div>
  )
}
