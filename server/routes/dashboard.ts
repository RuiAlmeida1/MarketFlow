import type { DashboardResponse } from '../../shared/api/contracts'
import type { RouteHandler } from '../http/context'
import { jsonResponse } from '../http/response'
import { dashboardQuerySchema, parseQuery } from '../validation/params'

export const getDashboard: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const query = parseQuery(dashboardQuerySchema, context.url)

  // Keep quotes near-live on dashboard reads, throttled to once a minute.
  try {
    await context.services.sync.refreshPricesIfStale(60_000)
  } catch (error) {
    console.warn('[dashboard] price revalidation failed', error)
  }

  const dashboard: DashboardResponse = await context.services.dashboard.getDashboard(
    userId,
    query.portfolioId,
    { period: query.period, dimension: query.dimension },
  )
  return jsonResponse(dashboard)
}
