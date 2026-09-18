import { useTheme } from '@/app/theme-context'
import { Badge } from '@/components/ui/badge'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiQuery } from '@/hooks/use-api-query'
import { api } from '@/lib/api-client'
import { formatDate } from '@/lib/format'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const

export function SettingsPage() {
  const { preference, setPreference } = useTheme()
  const me = useApiQuery('me', () => api.me())
  const health = useApiQuery('health', () => api.health())

  return (
    <div className="space-y-4">
      <SectionCard title="Appearance" description="Theme preference is saved on this device">
        <div
          role="radiogroup"
          aria-label="Theme preference"
          className="flex flex-wrap gap-2"
        >
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={preference === option.value}
              onClick={() => setPreference(option.value)}
              className={
                preference === option.value
                  ? 'rounded-lg border border-accent bg-accent-soft px-3 py-2 text-sm font-medium text-accent'
                  : 'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Account" description="Base currency and profile">
        {me.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Display name</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {me.data?.user.displayName ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {me.data?.user.email ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Base currency</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {me.data?.user.baseCurrency ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Language</dt>
              <dd className="mt-0.5 flex items-center gap-2 font-medium text-foreground">
                English <Badge variant="neutral">pt-PT soon</Badge>
              </dd>
            </div>
          </dl>
        )}
      </SectionCard>

      <SectionCard title="System" description="Runtime information">
        {health.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Environment</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {health.data?.environment ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Server time</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {health.data ? formatDate(health.data.timestamp, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </dd>
            </div>
          </dl>
        )}
      </SectionCard>
    </div>
  )
}
