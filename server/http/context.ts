import { ValidationError } from '../../shared/domain/errors'
import type { Env } from '../env'
import type { Services } from '../services/container'

export interface RequestContext {
  readonly request: Request
  readonly env: Env
  readonly services: Services
  readonly url: URL
  readonly params: Readonly<Record<string, string>>
  /**
   * Resolves (and memoizes) the authenticated user. Every portfolio query must
   * go through this, never through a client-supplied user id.
   */
  getUserId(): Promise<string>
}

export type RouteHandler = (context: RequestContext) => Promise<Response> | Response

/** Reads a required path parameter, failing with a 400 when absent. */
export function requireParam(context: RequestContext, name: string): string {
  const value = context.params[name]
  if (!value) {
    throw new ValidationError(`Missing path parameter "${name}".`)
  }
  return value
}
