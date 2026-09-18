import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { RequireAuth } from '@/components/layout/require-auth'
import { LoginPage } from '@/features/auth/login-page'
import {
  AnalyticsPage,
  CalendarPage,
  DashboardPage,
  DividendsPage,
  HelpPage,
  MarketsPage,
  PortfolioPage,
  ProfilePage,
  SearchPage,
  SettingsPage,
  TransactionsPage,
  WatchlistPage,
} from './lazy-pages'
import { NotFoundPage, PlaceholderPage } from '@/features/misc/placeholder-pages'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'dividends', element: <DividendsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'watchlist', element: <WatchlistPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'markets', element: <MarketsPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'help', element: <HelpPage /> },
      { path: 'profile', element: <ProfilePage /> },
      {
        path: 'reports',
        element: (
          <PlaceholderPage
            title="Reports"
            description="Exportable performance and tax reports are planned for a later phase."
          />
        ),
      },
      {
        path: 'goals',
        element: (
          <PlaceholderPage
            title="Goals"
            description="Financial goals and progress tracking are planned for a later phase."
          />
        ),
      },
      {
        path: 'import',
        element: (
          <PlaceholderPage
            title="Import"
            description="CSV and broker imports (Trading 212, XTB, Plaid) are planned for a later phase."
          />
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
