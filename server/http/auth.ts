import { UnauthorizedError } from '../../shared/domain/errors'
import type { Env } from '../env'
import type { Services } from '../services/container'

/**
 * Development fallback user. In production an authenticated identity must be
 * supplied via the `x-user-id` header (temporary bridge until real auth ships).
 */
export const DEFAULT_DEV_USER_ID = 'user-dev-1'

export async function resolveUserId(
  request: Request,
  env: Env,
  services: Services,
): Promise<string> {
  const headerUserId = request.headers.get('x-user-id')
  if (headerUserId) {
    const user = await services.users.findById(headerUserId)
    if (!user) throw new UnauthorizedError('Unknown user.')
    return user.id
  }

  if ((env.APP_ENV ?? 'production') !== 'production') {
    const devUser = await services.users.findById(DEFAULT_DEV_USER_ID)
    if (devUser) return devUser.id
    const firstUser = await services.users.findFirst()
    if (firstUser) return firstUser.id
  }

  throw new UnauthorizedError()
}
