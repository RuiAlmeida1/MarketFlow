import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  Briefcase,
  CalendarDays,
  ChartCandlestick,
  ChartLine,
  ChartNoAxesCombined,
  Coins,
  Eye,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Target,
  Upload,
  User,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Marks items that are scaffolded for a later phase. */
  upcoming?: boolean
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Portfolio', to: '/portfolio', icon: Briefcase },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Dividends', to: '/dividends', icon: Coins },
  { label: 'Analytics', to: '/analytics', icon: ChartLine },
  { label: 'Watchlist', to: '/watchlist', icon: Eye },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Markets', to: '/markets', icon: ChartCandlestick },
]

export const SECONDARY_NAV: readonly NavItem[] = [
  { label: 'Import', to: '/import', icon: Upload },
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Help', to: '/help', icon: LifeBuoy },
  { label: 'Profile', to: '/profile', icon: User },
]

export const UPCOMING_NAV: readonly NavItem[] = [
  { label: 'Reports', to: '/reports', icon: ChartNoAxesCombined, upcoming: true },
  { label: 'Goals', to: '/goals', icon: Target, upcoming: true },
]

export const ALL_NAV_ITEMS: readonly NavItem[] = [
  ...PRIMARY_NAV,
  ...SECONDARY_NAV,
  ...UPCOMING_NAV,
]

export function pageTitleForPath(pathname: string): string {
  const match = ALL_NAV_ITEMS.find((item) => pathname.startsWith(item.to))
  return match?.label ?? 'MarketFlow'
}
