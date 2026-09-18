import type { Env } from './env'
import { resolveUserId } from './http/auth'
import type { RequestContext } from './http/context'
import { preflightResponse, withCors } from './http/cors'
import { errorResponse } from './http/errors'
import { jsonResponse } from './http/response'
import { createRouter } from './routes'
import { createServices } from './services/container'

const router = createRouter()

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return preflightResponse(env)
    }

    const match = router.match(request.method, url.pathname)
    if (!match) {
      if (url.pathname.startsWith('/api/')) {
        return withCors(
          jsonResponse(
            { error: { code: 'NOT_FOUND', message: 'Route not found.' } },
            404,
          ),
          env,
        )
      }
      // Static assets / SPA fallback.
      return env.ASSETS.fetch(request)
    }

    const services = createServices(env)
    let cachedUserId: Promise<string> | null = null
    const context: RequestContext = {
      request,
      env,
      services,
      url,
      params: match.params,
      getUserId() {
        if (!cachedUserId) {
          cachedUserId = resolveUserId(request, env, services)
        }
        return cachedUserId
      },
    }

    try {
      const response = await match.handler(context)
      return withCors(response, env)
    } catch (error) {
      return withCors(errorResponse(error), env)
    }
  },
} satisfies ExportedHandler<Env>
