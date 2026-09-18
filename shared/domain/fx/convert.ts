import type { CurrencyCode } from '../money/currency'
import { type Money, convertMoney, zero } from '../money/money'
import type { FxResolver } from './exchange-rate'

export interface ConversionResult {
  readonly value: Money
  /** False when the rate is unavailable; `value` is then a zero placeholder. */
  readonly ok: boolean
}

/**
 * Converts an amount into the target currency using an {@link FxResolver}.
 * Never throws on a missing rate: callers decide how to surface the gap.
 */
export function convertWithResolver(
  value: Money,
  target: CurrencyCode,
  fx: FxResolver,
  date?: string,
): ConversionResult {
  if (value.currency === target) {
    return { value, ok: true }
  }
  const rate = fx.getRate(value.currency, target, date)
  if (rate == null) {
    return { value: zero(target), ok: false }
  }
  return { value: convertMoney(value, target, rate), ok: true }
}
