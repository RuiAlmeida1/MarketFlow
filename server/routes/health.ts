import type { HealthResponse } from '../../shared/api/contracts'
import type { RouteHandler } from '../http/context'
import { jsonResponse } from '../http/response'

export const healthHandler: RouteHandler = (context) => {
  const body: HealthResponse = {
    status: 'ok',
    environment: context.env.APP_ENV ?? 'production',
    timestamp: new Date().toISOString(),
  }
  return jsonResponse(body)
}
