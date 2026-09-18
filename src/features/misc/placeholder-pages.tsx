import { Link } from 'react-router-dom'
import { buttonClasses } from '@/components/ui/button-classes'
import { EmptyState } from '@/components/ui/empty-state'

export function NotFoundPage() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
      <EmptyState
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Link to="/dashboard" className={buttonClasses('primary', 'sm')}>
            Back to dashboard
          </Link>
        }
      />
    </div>
  )
}

export function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
      <EmptyState title={title} description={description} />
    </div>
  )
}
