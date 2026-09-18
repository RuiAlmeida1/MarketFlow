import {
  type ExchangeRate,
  type FxResolver,
  createSnapshotFxResolver,
  fxKey,
} from '../../shared/domain'
import type { FxRateRepository } from '../repositories/fx-rate-repository'

/**
 * Builds an FX snapshot for a request and exposes it as a synchronous
 * {@link FxResolver}. The snapshot is memoized per service instance (one per
 * request), so all calculations reuse a single set of rates.
 */
export class CurrencyConversionService {
  private resolverPromise: Promise<FxResolver> | null = null
  private ratesCache: ExchangeRate[] | null = null

  constructor(private readonly repository: FxRateRepository) {}

  async getResolver(): Promise<FxResolver> {
    if (!this.resolverPromise) {
      this.resolverPromise = this.load()
    }
    return this.resolverPromise
  }

  async getRates(): Promise<ExchangeRate[]> {
    if (!this.ratesCache) {
      this.ratesCache = await this.repository.latestRates()
    }
    return this.ratesCache
  }

  private async load(): Promise<FxResolver> {
    const rates = await this.getRates()
    const map = new Map<string, number>()
    for (const rate of rates) {
      map.set(fxKey(rate.base, rate.quote), rate.rate)
    }
    return createSnapshotFxResolver(map)
  }
}
