import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  applyTheme,
  getStoredTheme,
  storeTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme'
import { PortfolioContext, type PortfolioSelection } from './portfolio-context'
import { ThemeContext } from './theme-context'

const PORTFOLIO_STORAGE_KEY = 'marketflow.portfolio'

function subscribeSystemTheme(listener: () => void): () => void {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function getSystemThemeSnapshot(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getStoredTheme())
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    () => 'light' as const,
  )

  const resolved: ResolvedTheme = preference === 'system' ? systemTheme : preference

  // DOM side-effect only (no React state write): keeps <html class> in sync.
  useEffect(() => {
    applyTheme(preference)
  }, [preference, systemTheme])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    storeTheme(next)
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

function PortfolioProvider({ children }: { children: ReactNode }) {
  const [selectedPortfolioId, setSelectedState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(PORTFOLIO_STORAGE_KEY)
  })

  const setSelectedPortfolioId = useCallback((id: string | null) => {
    setSelectedState(id)
    if (typeof window === 'undefined') return
    if (id) {
      window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, id)
    } else {
      window.localStorage.removeItem(PORTFOLIO_STORAGE_KEY)
    }
  }, [])

  const value = useMemo<PortfolioSelection>(
    () => ({ selectedPortfolioId, setSelectedPortfolioId }),
    [selectedPortfolioId, setSelectedPortfolioId],
  )

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PortfolioProvider>{children}</PortfolioProvider>
    </ThemeProvider>
  )
}
