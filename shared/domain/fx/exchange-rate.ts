import { DomainError } from '../errors'
import type { CurrencyCode } from '../money/currency'

/**
 * An exchange rate expresses `1 base = rate quote` on a given date.
 */
export interface ExchangeRate {
  readonly base: CurrencyCode
  readonly quote: CurrencyCode
  readonly rate: number
  /** Calendar date (YYYY-MM-DD) the rate applies to. */
  readonly rateDate: string
  readonly timestamp: string
  readonly source: string
}

/**
 * Port for FX providers. A real provider (ECB, OpenExchangeRates, ...) will be
 * plugged in Phase 2 without touching analytics code.
 */
export interface ExchangeRateProvider {
  getRate(base: CurrencyCode, quote: CurrencyCode, date?: string): Promise<number | null>
  getLatestRate(base: CurrencyCode, quote: CurrencyCode): Promise<number | null>
}

/**
 * Synchronous FX resolution used by pure financial calculations.
 * Implementations must return `null` when a rate is unavailable so callers can
 * degrade gracefully instead of fabricating a value.
 */
export interface FxResolver {
  getRate(base: CurrencyCode, quote: CurrencyCode, date?: string): number | null
}

export function fxKey(base: CurrencyCode, quote: CurrencyCode): string {
  return `${base}:${quote}`
}

export function invertRate(rate: number): number {
  if (!Number.isFinite(rate) || rate === 0) {
    throw new DomainError('EXCHANGE_RATE_UNAVAILABLE', 'Cannot invert a zero or non-finite rate.')
  }
  return 1 / rate
}

/** FX resolver for same-currency operations (identity). */
export const identityFxResolver: FxResolver = {
  getRate(base, quote) {
    return base === quote ? 1 : null
  },
}

/**
 * In-memory resolver backed by a static table. Development/seed use only.
 * Lookups are exact; date is accepted for interface parity and ignored.
 */
export function createStaticFxResolver(
  rates: Record<string, number>,
  options: { inferInverse?: boolean } = {},
): FxResolver {
  const inferInverse = options.inferInverse ?? true
  return {
    getRate(base, quote) {
      if (base === quote) return 1
      const direct = rates[fxKey(base, quote)]
      if (direct != null) return direct
      if (inferInverse) {
        const inverse = rates[fxKey(quote, base)]
        if (inverse != null && inverse !== 0) return 1 / inverse
      }
      return null
    },
  }
}

/**
 * Adapts an async {@link ExchangeRateProvider} into a synchronous resolver by
 * consuming a pre-fetched rate snapshot. This keeps pure calculations pure
 * while still being driven by a real provider.
 */
export function createSnapshotFxResolver(
  snapshot: ReadonlyMap<string, number>,
): FxResolver {
  return {
    getRate(base, quote) {
      if (base === quote) return 1
      const direct = snapshot.get(fxKey(base, quote))
      if (direct != null) return direct
      const inverse = snapshot.get(fxKey(quote, base))
      if (inverse != null && inverse !== 0) return 1 / inverse
      return null
    },
  }
}
