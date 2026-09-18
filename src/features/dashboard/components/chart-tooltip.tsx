import type { ReactNode } from 'react'

export function TooltipShell({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="min-w-[11rem] rounded-lg border border-border bg-surface px-3 py-2 text-xs surface-shadow">
      {title ? <p className="mb-1.5 font-medium text-foreground">{title}</p> : null}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function TooltipRow({
  label,
  value,
  color,
  emphasize = false,
}: {
  label: string
  value: string
  color?: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted">
        {color ? (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        ) : null}
        {label}
      </span>
      <span
        className={
          emphasize
            ? 'font-semibold tabular-nums text-foreground'
            : 'tabular-nums text-foreground'
        }
      >
        {value}
      </span>
    </div>
  )
}
