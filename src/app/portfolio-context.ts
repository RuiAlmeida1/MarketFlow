import { createContext, useContext } from 'react'

export interface PortfolioSelection {
  /** `null` means "All portfolios" (resolved to the user's default portfolio). */
  selectedPortfolioId: string | null
  setSelectedPortfolioId: (id: string | null) => void
}

export const PortfolioContext = createContext<PortfolioSelection | null>(null)

export function usePortfolioSelection(): PortfolioSelection {
  const context = useContext(PortfolioContext)
  if (!context) {
    throw new Error('usePortfolioSelection must be used within a PortfolioProvider.')
  }
  return context
}
