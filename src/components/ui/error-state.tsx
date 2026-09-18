import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './button'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
  compact?: boolean
  action?: ReactNode
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
  compact = false,
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-2 text-center',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-negative-soft text-negative">
        <TriangleAlert className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-md text-xs text-muted">{message}</p>
      <div className="mt-2 flex items-center gap-2">
        {onRetry ? (
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  )
}
