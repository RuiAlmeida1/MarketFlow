import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/cn'
import {
  PRIMARY_NAV,
  SECONDARY_NAV,
  UPCOMING_NAV,
  type NavItem,
} from './nav-items'

type LabelMode = 'always' | 'xl'

interface NavSectionProps {
  items: readonly NavItem[]
  labelMode: LabelMode
  title?: string
  onNavigate?: () => void
}

function NavSection({ items, labelMode, title, onNavigate }: NavSectionProps) {
  const labelClass = labelMode === 'always' ? 'inline' : 'hidden xl:inline'
  return (
    <div>
      {title ? (
        <p
          className={cn(
            'mb-1 px-2.5 text-[10px] font-semibold tracking-wider text-subtle uppercase',
            labelClass,
          )}
        >
          {title}
        </p>
      ) : null}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              title={labelMode === 'xl' ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                  labelMode === 'xl' && 'justify-center xl:justify-start',
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-surface-hover hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={cn('truncate', labelClass)}>{item.label}</span>
              {item.upcoming ? (
                <span
                  className={cn(
                    'ml-auto rounded bg-surface-hover px-1.5 py-0.5 text-[10px] text-subtle',
                    labelClass,
                  )}
                >
                  Soon
                </span>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SidebarBody({
  labelMode,
  onNavigate,
}: {
  labelMode: LabelMode
  onNavigate?: () => void
}) {
  return (
    <>
      <div
        className={cn(
          'flex h-16 shrink-0 items-center px-3 xl:px-4',
          labelMode === 'xl' && 'justify-center xl:justify-start',
        )}
      >
        <Logo showText={labelMode === 'always'} />
      </div>
      <nav
        aria-label="Primary"
        className="scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-2"
      >
        <NavSection items={PRIMARY_NAV} labelMode={labelMode} onNavigate={onNavigate} />
        <div className="mt-auto space-y-3 pt-4">
          <NavSection
            items={UPCOMING_NAV}
            labelMode={labelMode}
            title="Planned"
            onNavigate={onNavigate}
          />
          <div className="h-px bg-border" role="separator" />
          <NavSection items={SECONDARY_NAV} labelMode={labelMode} onNavigate={onNavigate} />
        </div>
      </nav>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col border-r border-border bg-surface lg:flex xl:w-64">
      <SidebarBody labelMode="xl" />
    </aside>
  )
}

export function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <div
      className={cn('fixed inset-0 z-50 lg:hidden', !open && 'pointer-events-none')}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 cursor-default bg-black/50 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          'absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute top-4 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <SidebarBody labelMode="always" onNavigate={onClose} />
      </div>
    </div>
  )
}
