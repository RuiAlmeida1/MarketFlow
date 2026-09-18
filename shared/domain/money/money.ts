import { CurrencyMismatchError, DomainError } from '../errors'
import {
  type CurrencyCode,
  assertCurrencyCode,
  currencyMinorUnits,
} from './currency'

/**
 * Money is an immutable value object.
 *
 * Invariant: `minorUnits` is an integer number of the currency's minor unit
 * (cents for EUR/USD, whole yen for JPY). Financial arithmetic must never rely
 * on floating point, which is why all operations happen on integers and the
 * major-unit value is only derived for display.
 *
 * Precision note: amounts are bounded by `Number.MAX_SAFE_INTEGER` minor units
 * (~9e15), which is more than sufficient for personal/enterprise portfolios.
 * Sub-minor-unit precision (e.g. crypto) is intentionally NOT modelled here;
 * asset quantities carry that precision separately.
 */
export interface Money {
  readonly minorUnits: number
  readonly currency: CurrencyCode
}

function assertSafeInteger(value: number, context: string): void {
  if (!Number.isFinite(value)) {
    throw new DomainError('ARITHMETIC_OVERFLOW', `${context}: value is not finite.`, { value })
  }
  if (!Number.isSafeInteger(value)) {
    throw new DomainError('ARITHMETIC_OVERFLOW', `${context}: value exceeds safe integer range.`, {
      value,
    })
  }
}

/** Rounds half away from zero (commercial rounding, symmetric for negatives). */
export function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) {
    throw new DomainError('ARITHMETIC_OVERFLOW', 'Cannot round a non-finite value.', { value })
  }
  return value < 0 ? -Math.round(-value) : Math.round(value)
}

/** Constructs Money from an integer amount in minor units. */
export function money(minorUnits: number, currency: CurrencyCode): Money {
  assertCurrencyCode(currency)
  const rounded = roundHalfAwayFromZero(minorUnits)
  assertSafeInteger(rounded, 'money')
  return { minorUnits: rounded, currency }
}

/** Constructs Money from a major-unit amount (e.g. `12.34` EUR -> `1234`). */
export function fromMajor(amount: number, currency: CurrencyCode): Money {
  assertCurrencyCode(currency)
  const factor = 10 ** currencyMinorUnits(currency)
  return money(roundHalfAwayFromZero(amount * factor), currency)
}

/** Derives the major-unit value. Display-only: never use for arithmetic. */
export function toMajor(value: Money): number {
  return value.minorUnits / 10 ** currencyMinorUnits(value.currency)
}

export function zero(currency: CurrencyCode): Money {
  return money(0, currency)
}

export function sameCurrency(a: Money, b: Money): boolean {
  return a.currency === b.currency
}

function assertSameCurrency(a: Money, b: Money): void {
  if (!sameCurrency(a, b)) {
    throw new CurrencyMismatchError(a.currency, b.currency)
  }
}

export function negate(value: Money): Money {
  return money(-value.minorUnits, value.currency)
}

export function absolute(value: Money): Money {
  return money(Math.abs(value.minorUnits), value.currency)
}

/**
 * Adds two amounts. Throws {@link CurrencyMismatchError} unless both share the
 * same currency; callers must convert explicitly first.
 */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return money(a.minorUnits + b.minorUnits, a.currency)
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return money(a.minorUnits - b.minorUnits, a.currency)
}

/** Multiplies by a dimensionless factor (quantity, percentage as decimal). */
export function multiplyMoney(value: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new DomainError('ARITHMETIC_OVERFLOW', 'Multiplication factor is not finite.', { factor })
  }
  return money(roundHalfAwayFromZero(value.minorUnits * factor), value.currency)
}

/** Multiplies by a percentage expressed in percentage points (`3.5` -> 3.5%). */
export function multiplyMoneyByPercentage(value: Money, percentage: number): Money {
  return multiplyMoney(value, percentage / 100)
}

export function divideMoney(value: Money, divisor: number): Money {
  if (!Number.isFinite(divisor) || divisor === 0) {
    throw new DomainError('ARITHMETIC_OVERFLOW', 'Division by zero or non-finite divisor.', {
      divisor,
    })
  }
  return money(roundHalfAwayFromZero(value.minorUnits / divisor), value.currency)
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce<Money>((acc, value) => addMoney(acc, value), zero(currency))
}

export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b)
  if (a.minorUnits === b.minorUnits) return 0
  return a.minorUnits < b.minorUnits ? -1 : 1
}

export function isZero(value: Money): boolean {
  return value.minorUnits === 0
}

export function isNegative(value: Money): boolean {
  return value.minorUnits < 0
}

export function isPositive(value: Money): boolean {
  return value.minorUnits > 0
}

/**
 * Splits an amount into integer minor units across weights without losing or
 * inventing money. The remainder is distributed to the largest fractional
 * parts first (largest remainder method), so `sum(result) === total` always.
 *
 * This is the correct primitive for allocation/donut charts.
 */
export function allocateMoney(total: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'Cannot allocate money across zero buckets.')
  }
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new DomainError('VALIDATION_ERROR', 'Allocation weights must be finite and non-negative.')
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight === 0) {
    return weights.map(() => zero(total.currency))
  }

  const raw = weights.map((weight) => (total.minorUnits * weight) / totalWeight)
  const floored = raw.map((value) => Math.floor(value))
  let remaining = total.minorUnits - floored.reduce((sum, value) => sum + value, 0)

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)

  const result = [...floored]
  let cursor = 0
  while (remaining > 0 && order.length > 0) {
    const target = order[cursor % order.length]
    if (target) {
      result[target.index] = (result[target.index] ?? 0) + 1
    }
    remaining -= 1
    cursor += 1
  }

  return result.map((value) => money(value, total.currency))
}

/**
 * Converts between currencies with awareness of differing minor units
 * (e.g. EUR -> JPY). The rate is expressed as `1 base = rate quote`.
 */
export function convertMoney(value: Money, target: CurrencyCode, rate: number): Money {
  assertCurrencyCode(target)
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new DomainError('EXCHANGE_RATE_UNAVAILABLE', 'Invalid exchange rate.', { rate })
  }
  if (value.currency === target) return value
  return fromMajor(toMajor(value) * rate, target)
}

/** Converts using minor units directly when both currencies share an exponent. */
export function convertMoneyAtMinorUnitRate(
  value: Money,
  target: CurrencyCode,
  rate: number,
): Money {
  assertCurrencyCode(target)
  if (currencyMinorUnits(value.currency) !== currencyMinorUnits(target)) {
    return convertMoney(value, target, rate)
  }
  return money(roundHalfAwayFromZero(value.minorUnits * rate), target)
}
