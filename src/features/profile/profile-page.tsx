import { SectionCard } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiQuery } from '@/hooks/use-api-query'
import { api } from '@/lib/api-client'
import { formatDate } from '@/lib/format'

export function ProfilePage() {
  const query = useApiQuery('me', () => api.me())
  const user = query.data?.user

  if (query.isLoading) {
    return (
      <SectionCard title="Profile">
        <Skeleton className="h-32 w-full" />
      </SectionCard>
    )
  }

  if (query.error || !user) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
        <ErrorState
          message={query.error?.message ?? 'Profile unavailable.'}
          onRetry={query.refetch}
        />
      </div>
    )
  }

  const initials = user.displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 surface-shadow">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-soft text-lg font-semibold text-accent">
          {initials}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{user.displayName}</h2>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <SectionCard title="Details" description="Account information">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">User ID</dt>
            <dd className="mt-0.5 font-mono text-xs text-foreground">{user.id}</dd>
          </div>
          <div>
            <dt className="text-muted">Base currency</dt>
            <dd className="mt-0.5 font-medium text-foreground">{user.baseCurrency}</dd>
          </div>
          <div>
            <dt className="text-muted">Member since</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {formatDate(user.createdAt, { dateStyle: 'long' })}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Last updated</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {formatDate(user.updatedAt, { dateStyle: 'long' })}
            </dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  )
}
