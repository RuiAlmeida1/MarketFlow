import type { Env } from '../env'

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, x-user-id',
  'access-control-max-age': '86400',
}

/**
 * The API is served from the same origin as the SPA in production; CORS is a
 * development convenience for tooling. No credentials are allowed.
 */
export function withCors(response: Response, env: Env): Response {
  if (env.APP_ENV === 'production') return response
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function preflightResponse(env: Env): Response {
  if (env.APP_ENV === 'production') return new Response(null, { status: 204 })
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
