import { usePortfolioSelection } from '@/app/portfolio-context'
import type { Portfolio } from '@shared/domain'
import { useApiQuery } from './use-api-query'
import { api } from '@/lib/api-client'
import type { ApiClientError } from '@/lib/api-client'

export interface SelectedPortfolioResult {
  portfolio: Portfolio | null
  isLoading: boolean
  error: ApiClientError | null
  refetch: () => void
}

/**
 * Resolves the active portfolio (explicit selection or the user's default) so
 * non-dashboard pages can request their own slice of data.
 */
export function useSelectedPortfolio(): SelectedPortfolioResult {
  const { selectedPortfolioId } = usePortfolioSelection()
  const query = useApiQuery('portfolios', () => api.portfolios())
  const portfolios = query.data?.portfolios ?? []

  const portfolio =
    (selectedPortfolioId
      ? portfolios.find((candidate) => candidate.id === selectedPortfolioId)
      : undefined) ??
    portfolios.find((candidate) => candidate.isDefault) ??
    portfolios[0] ??
    null

  return {
    portfolio,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
