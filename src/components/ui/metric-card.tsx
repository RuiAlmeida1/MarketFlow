import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneBackgroundClass, type ValueTone } from '@/lib/format'

export interface MetricCardProps {
  label: string
  value: string
  secondary?: string
  hint?: string
  icon?: LucideIcon
  tone?: ValueTone
  className?: string
}

export function MetricCard({
  label,
  value,
  secondary,
  hint,
  icon: Icon,
  tone,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface p-4 surface-shadow',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon ? (
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md',
              tone ? toneBackgroundClass(tone) : 'bg-surface-hover text-subtle',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {secondary ? (
        <p
          className={cn(
            'mt-1 text-xs font-medium tabular-nums',
            tone === 'positive'
              ? 'text-positive'
              : tone === 'negative'
                ? 'text-negative'
                : 'text-muted',
          )}
        >
          {secondary}
        </p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    </div>
  )
}
