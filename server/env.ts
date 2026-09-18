/**
 * Cloudflare Worker bindings.
 *
 * `D1Database` and `Fetcher` are ambient types provided by
 * `@cloudflare/workers-types`.
 */
export interface Env {
  readonly DB: D1Database
  readonly ASSETS: Fetcher
  readonly APP_ENV?: string
}
