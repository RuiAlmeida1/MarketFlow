import type { DashboardResponse } from '../../shared/api/contracts'
import type { RouteHandler } from '../http/context'
import { jsonResponse } from '../http/response'
import { dashboardQuerySchema, parseQuery } from '../validation/params'

export const getDashboard: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const query = parseQuery(dashboardQuerySchema, context.url)
  const dashboard: DashboardResponse = await context.services.dashboard.getDashboard(
    userId,
    query.portfolioId,
    { period: query.period, dimension: query.dimension },
  )
  return jsonResponse(dashboard)
}
