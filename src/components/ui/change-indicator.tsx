import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { Money } from '@shared/domain'
import { cn } from '@/lib/cn'
import {
  formatSignedMoney,
  formatSignedPercentage,
  toneTextClass,
  valueTone,
} from '@/lib/format'

export interface ChangeIndicatorProps {
  percentage: number
  absolute?: Money
  showAbsolute?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ChangeIndicator({
  percentage,
  absolute,
  showAbsolute = false,
  size = 'sm',
  className,
}: ChangeIndicatorProps) {
  const tone = valueTone(percentage)
  const Icon = tone === 'negative' ? ArrowDownRight : ArrowUpRight
  const isNeutral = tone === 'neutral'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular-nums',
        size === 'sm' ? 'text-xs' : 'text-sm',
        isNeutral ? 'text-muted' : toneTextClass(tone),
        className,
      )}
    >
      {!isNeutral ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      <span>{formatSignedPercentage(percentage)}</span>
      {showAbsolute && absolute ? (
        <span className="text-muted">({formatSignedMoney(absolute)})</span>
      ) : null}
    </span>
  )
}
