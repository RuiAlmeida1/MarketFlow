import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function MetricSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <Skeleton className="mt-3 h-6 w-28" />
      <Skeleton className="mt-2 h-3 w-20" />
    </Card>
  )
}

function PanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <Card className="p-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-48 w-full" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className="h-3 w-full" />
        ))}
      </div>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Card className="p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-10 w-56" />
        <Skeleton className="mt-3 h-4 w-40" />
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PanelSkeleton />
        <PanelSkeleton />
        <PanelSkeleton />
        <PanelSkeleton />
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </div>
  )
}
