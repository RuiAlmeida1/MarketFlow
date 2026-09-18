import { lazy } from 'react'

/**
 * Route-level code splitting. Pages (and their heavy dependencies such as
 * Recharts) are loaded on demand, keeping the initial shell small.
 */
export const DashboardPage = lazy(() =>
  import('@/features/dashboard/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
)

export const PortfolioPage = lazy(() =>
  import('@/features/portfolio/portfolio-page').then((module) => ({
    default: module.PortfolioPage,
  })),
)

export const TransactionsPage = lazy(() =>
  import('@/features/transactions/transactions-page').then((module) => ({
    default: module.TransactionsPage,
  })),
)

export const DividendsPage = lazy(() =>
  import('@/features/dividends/dividends-page').then((module) => ({
    default: module.DividendsPage,
  })),
)

export const AnalyticsPage = lazy(() =>
  import('@/features/analytics/analytics-page').then((module) => ({
    default: module.AnalyticsPage,
  })),
)

export const WatchlistPage = lazy(() =>
  import('@/features/watchlist/watchlist-page').then((module) => ({
    default: module.WatchlistPage,
  })),
)

export const CalendarPage = lazy(() =>
  import('@/features/calendar/calendar-page').then((module) => ({
    default: module.CalendarPage,
  })),
)

export const MarketsPage = lazy(() =>
  import('@/features/markets/markets-page').then((module) => ({
    default: module.MarketsPage,
  })),
)

export const SearchPage = lazy(() =>
  import('@/features/search/search-page').then((module) => ({
    default: module.SearchPage,
  })),
)

export const SettingsPage = lazy(() =>
  import('@/features/settings/settings-page').then((module) => ({
    default: module.SettingsPage,
  })),
)

export const ProfilePage = lazy(() =>
  import('@/features/profile/profile-page').then((module) => ({
    default: module.ProfilePage,
  })),
)

export const HelpPage = lazy(() =>
  import('@/features/help/help-page').then((module) => ({
    default: module.HelpPage,
  })),
)
