import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Generic fallback shown while a route chunk loads. */
export function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Card className="p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-52" />
      </Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-28" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-56 w-full" />
      </Card>
    </div>
  )
}
