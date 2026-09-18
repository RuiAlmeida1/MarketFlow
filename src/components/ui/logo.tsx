import { ChartNoAxesCombined } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[color:var(--color-accent-foreground)]">
        <ChartNoAxesCombined className="h-4 w-4" aria-hidden="true" />
      </span>
      <span
        className={cn(
          'text-sm font-semibold tracking-tight text-foreground',
          showText ? 'inline' : 'hidden xl:inline',
        )}
      >
        MarketFlow
      </span>
    </span>
  )
}
