import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-hover', className)}
    />
  )
}

export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3 w-full', className)} />
}
