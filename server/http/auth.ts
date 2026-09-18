import { UnauthorizedError } from '../../shared/domain/errors'
import { verifyAccessJwt } from '../auth/access-jwt'
import { SESSION_COOKIE_NAME, verifySessionToken } from '../auth/session'
import type { Env } from '../env'
import type { Services } from '../services/container'
import { parseCookies } from './cookies'

/**
 * Development fallback user. Only used when `APP_ENV !== "production"`; in
 * production every request must be authenticated.
 */
export const DEFAULT_DEV_USER_ID = 'user-dev-1'

const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion'

/**
 * Resolves the authenticated user id, in order of precedence:
 *  1. Cloudflare Access JWT (when configured).
 *  2. Signed session cookie (built-in email/password sign-in).
 *  3. Development fallback (non-production only).
 * Ownership is enforced later by the services.
 */
export async function resolveUserId(
  request: Request,
  env: Env,
  services: Services,
): Promise<string> {
  const accessToken = request.headers.get(ACCESS_JWT_HEADER)
  if (accessToken) {
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
      throw new UnauthorizedError('Cloudflare Access is not configured.')
    }
    const identity = await verifyAccessJwt(accessToken, {
      teamDomain: env.ACCESS_TEAM_DOMAIN,
      aud: env.ACCESS_AUD,
    })
    const user = await services.accounts.resolveForEmail(identity.email, identity.name)
    return user.id
  }

  const cookies = parseCookies(request.headers.get('cookie'))
  const sessionToken = cookies[SESSION_COOKIE_NAME]
  if (sessionToken && env.SESSION_SECRET) {
    const session = await verifySessionToken(sessionToken, env.SESSION_SECRET)
    if (session) {
      const user = await services.users.findById(session.userId)
      if (user) return user.id
    }
  }

  if ((env.APP_ENV ?? 'production') !== 'production') {
    const headerUserId = request.headers.get('x-user-id')
    if (headerUserId) {
      const user = await services.users.findById(headerUserId)
      if (user) return user.id
    }
    const devUser = await services.users.findById(DEFAULT_DEV_USER_ID)
    if (devUser) return devUser.id
    const firstUser = await services.users.findFirst()
    if (firstUser) return firstUser.id
  }

  throw new UnauthorizedError()
}
