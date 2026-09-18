import { DomainError } from '../errors'

/**
 * Currencies supported by MarketFlow.
 *
 * ISO 4217 codes with their number of minor units (decimal places). Most
 * currencies use 2 minor units, JPY has 0. The `minorUnits` value is the single
 * source of truth for converting between major and minor representations.
 */
export const CURRENCY_CODES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'CAD',
  'JPY',
  'AUD',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'BRL',
  'MXN',
  'INR',
  'SGD',
  'HKD',
  'ZAR',
] as const

export type CurrencyCode = (typeof CURRENCY_CODES)[number]

export interface CurrencyDefinition {
  readonly code: CurrencyCode
  readonly name: string
  readonly symbol: string
  /** Number of decimal places used by the currency (ISO 4217 exponent). */
  readonly minorUnits: number
}

export const CURRENCIES: Record<CurrencyCode, CurrencyDefinition> = {
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', minorUnits: 2 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', minorUnits: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', minorUnits: 2 },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', minorUnits: 2 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', minorUnits: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', minorUnits: 0 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', minorUnits: 2 },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', minorUnits: 2 },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', minorUnits: 2 },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', minorUnits: 2 },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', minorUnits: 2 },
  PLN: { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', minorUnits: 2 },
  CZK: { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', minorUnits: 2 },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', minorUnits: 2 },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', minorUnits: 2 },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', minorUnits: 2 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', minorUnits: 2 },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', minorUnits: 2 },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', minorUnits: 2 },
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value)
}

export function assertCurrencyCode(value: unknown): CurrencyCode {
  if (!isCurrencyCode(value)) {
    throw new DomainError(
      'UNSUPPORTED_CURRENCY',
      `Unsupported currency code: ${String(value)}.`,
    )
  }
  return value
}

export function getCurrency(code: CurrencyCode): CurrencyDefinition {
  return CURRENCIES[code]
}

export function currencyMinorUnits(code: CurrencyCode): number {
  return CURRENCIES[code].minorUnits
}

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES[code].symbol
}
