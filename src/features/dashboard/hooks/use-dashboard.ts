import { useState } from 'react'
import type { DashboardResponse, PerformancePeriod } from '@shared/api/contracts'
import type { AllocationDimension } from '@shared/domain'
import { usePortfolioSelection } from '@/app/portfolio-context'
import { useApiQuery, type ApiQueryResult } from '@/hooks/use-api-query'
import { api } from '@/lib/api-client'

export interface UseDashboardResult extends ApiQueryResult<DashboardResponse> {
  period: PerformancePeriod
  setPeriod: (period: PerformancePeriod) => void
  dimension: AllocationDimension
  setDimension: (dimension: AllocationDimension) => void
}

/**
 * Single aggregated request for the dashboard. Changing the period or
 * allocation dimension reuses the same endpoint (different cache key) rather
 * than issuing several component-level requests.
 */
export function useDashboard(): UseDashboardResult {
  const { selectedPortfolioId } = usePortfolioSelection()
  const [period, setPeriod] = useState<PerformancePeriod>('1Y')
  const [dimension, setDimension] = useState<AllocationDimension>('sector')

  const key = `dashboard:${selectedPortfolioId ?? 'all'}:${period}:${dimension}`
  const query = useApiQuery(key, () =>
    api.dashboard({
      portfolioId: selectedPortfolioId ?? undefined,
      period,
      dimension,
    }),
  )

  return { ...query, period, setPeriod, dimension, setDimension }
}
