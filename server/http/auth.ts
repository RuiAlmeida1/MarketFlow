import { UnauthorizedError } from '../../shared/domain/errors'
import { verifyAccessJwt } from '../auth/access-jwt'
import type { Env } from '../env'
import type { Services } from '../services/container'

/**
 * Development fallback user. Only used when `APP_ENV !== "production"`; in
 * production every request must be authenticated via Cloudflare Access.
 */
export const DEFAULT_DEV_USER_ID = 'user-dev-1'

const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion'

/**
 * Resolves the authenticated user id.
 *
 * Production: verifies the Cloudflare Access JWT, then maps (or provisions) the
 * D1 user for that email. Ownership is enforced later by the services.
 * Development: falls back to the seeded user so local work needs no login.
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
