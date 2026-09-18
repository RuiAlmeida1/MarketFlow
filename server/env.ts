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
   * Cloudflare Access (Zero Trust) configuration. When set, every request must
   * carry a valid `Cf-Access-Jwt-Assertion` token. Both values are public
   * (non-secret) and come from the Access application settings.
   */
  readonly ACCESS_TEAM_DOMAIN?: string
  readonly ACCESS_AUD?: string
  /**
   * Built-in email/password sign-in (single user). AUTH_PASSWORD and
   * SESSION_SECRET are Worker secrets; AUTH_EMAIL is a public var.
   */
  readonly AUTH_EMAIL?: string
  readonly AUTH_PASSWORD?: string
  readonly SESSION_SECRET?: string
  /**
   * Finnhub API key. Provided as a Worker secret in production
   * (`wrangler secret put FINNHUB_API_KEY`) and via `.dev.vars` locally.
   * When absent, the market data provider falls back to the mock.
   */
  readonly FINNHUB_API_KEY?: string
}
