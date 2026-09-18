import {
  Bell,
  CalendarClock,
  Coins,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { Popover, PopoverItem } from '@/components/ui/popover'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { pageTitleForPath } from './nav-items'
import { PortfolioSelector } from './portfolio-selector'

function HeaderSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    setQuery('')
  }

  return (
    <form role="search" onSubmit={onSubmit} className="relative hidden md:block">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-subtle"
        aria-hidden="true"
      />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search assets…"
        aria-label="Search assets"
        className="h-9 w-44 rounded-lg border border-border bg-surface pl-8 pr-3 text-sm text-foreground placeholder:text-subtle xl:w-64"
      />
    </form>
  )
}

function NotificationsMenu() {
  return (
    <Popover
      label="Notifications"
      panelClassName="w-72"
      trigger={({ open, toggle }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className="relative"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span
            className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent"
            aria-hidden="true"
          />
        </Button>
      )}
    >
      <p className="px-2.5 py-2 text-xs font-semibold text-muted">Notifications</p>
      <PopoverItem>
        <CalendarClock className="h-4 w-4 text-subtle" aria-hidden="true" />
        <span className="flex-1">
          Upcoming dividend for <strong>WM</strong> on 19 Sep
        </span>
      </PopoverItem>
      <PopoverItem>
        <Coins className="h-4 w-4 text-subtle" aria-hidden="true" />
        <span className="flex-1">
          Dividend received: <strong>O</strong> €8.27
        </span>
      </PopoverItem>
      <p className="px-2.5 pt-2 pb-1 text-[11px] text-subtle">
        Development sample data
      </p>
    </Popover>
  )
}

function ProfileMenu() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const initials = user
    ? user.displayName
        .split(' ')
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '··'

  const handleLogout = () => {
    void logout().then(() => navigate('/login', { replace: true }))
  }

  return (
    <Popover
      label="Account"
      panelClassName="w-60"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pr-2.5 pl-1 transition-colors hover:bg-surface-hover"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-xs font-semibold text-accent">
            {initials}
          </span>
          <span className="hidden max-w-[8rem] truncate text-sm text-foreground lg:block">
            {user?.displayName ?? 'Account'}
          </span>
        </button>
      )}
    >
      <div className="px-2.5 py-2">
        <p className="truncate text-sm font-medium text-foreground">
          {user?.displayName ?? 'Account'}
        </p>
        <p className="truncate text-xs text-muted">{user?.email ?? ''}</p>
      </div>
      <div className="my-1 h-px bg-border" role="separator" />
      <PopoverItem onClick={() => navigate('/profile')}>
        <User className="h-4 w-4 text-subtle" aria-hidden="true" /> Profile
      </PopoverItem>
      <PopoverItem onClick={() => navigate('/settings')}>
        <Settings className="h-4 w-4 text-subtle" aria-hidden="true" /> Settings
      </PopoverItem>
      <PopoverItem onClick={handleLogout}>
        <LogOut className="h-4 w-4 text-subtle" aria-hidden="true" /> Sign out
      </PopoverItem>
    </Popover>
  )
}

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const location = useLocation()
  const title = pageTitleForPath(location.pathname)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <HeaderSearch />
          <PortfolioSelector />
          <NotificationsMenu />
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
