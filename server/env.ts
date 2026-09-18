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
  /**
   * Finnhub API key. Provided as a Worker secret in production
   * (`wrangler secret put FINNHUB_API_KEY`) and via `.dev.vars` locally.
   * When absent, the market data provider falls back to the mock.
   */
  readonly FINNHUB_API_KEY?: string
}
