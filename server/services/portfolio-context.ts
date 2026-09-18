import type { FxResolver, Portfolio, Position } from '../../shared/domain'
import type { AssetPricePair } from '../repositories/price-repository'

/**
 * Everything needed to value a portfolio, loaded exactly once per request.
 * Passing this object around prevents repeated D1 round-trips in the dashboard.
 */
export interface PortfolioContext {
  readonly portfolio: Portfolio
  readonly positions: readonly Position[]
  readonly prices: ReadonlyMap<string, AssetPricePair>
  readonly fx: FxResolver
}
