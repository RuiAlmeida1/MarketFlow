import { type CurrencyCode, assertCurrencyCode } from './currency'
import { type Money, toMajor } from './money'

/**
 * Localization architecture.
 *
 * Formatting is centralized here and is intentionally locale-aware so a future
 * language switch (pt-PT / en-US) requires no changes at call sites.
 */
export const SUPPORTED_LOCALES = ['en-US', 'pt-PT'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = 'en-US'

export type DateInput = Date | string | number

export interface FormatMoneyOptions {
  locale?: string
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  compact?: boolean
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never'
  showCurrency?: boolean
}

export interface FormatNumberOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  compact?: boolean
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never'
}

export interface FormatPercentageOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never'
}

export interface FormatDateOptions {
  locale?: string
  dateStyle?: 'full' | 'long' | 'medium' | 'short'
  timeStyle?: 'full' | 'long' | 'medium' | 'short'
}

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

function buildNumberFormatOptions(
  options: FormatNumberOptions,
): Intl.NumberFormatOptions {
  return {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
    ...(options.compact
      ? { notation: 'compact' as const, compactDisplay: 'short' as const }
      : {}),
    ...(options.signDisplay ? { signDisplay: options.signDisplay } : {}),
  }
}

/** Formats a currency amount (from either Money or a major-unit number). */
export function formatMoney(value: Money, options: FormatMoneyOptions = {}): string {
  assertCurrencyCode(value.currency)
  const locale = options.locale ?? DEFAULT_LOCALE
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    currencyDisplay: options.currencyDisplay ?? 'symbol',
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
    ...(options.compact
      ? { notation: 'compact' as const, compactDisplay: 'short' as const }
      : {}),
    ...(options.signDisplay ? { signDisplay: options.signDisplay } : {}),
  }).format(toMajor(value))
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  options: FormatMoneyOptions = {},
): string {
  assertCurrencyCode(currency)
  const locale = options.locale ?? DEFAULT_LOCALE
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: options.currencyDisplay ?? 'symbol',
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
    ...(options.compact
      ? { notation: 'compact' as const, compactDisplay: 'short' as const }
      : {}),
    ...(options.signDisplay ? { signDisplay: options.signDisplay } : {}),
  }).format(amount)
}

export function formatCompactCurrency(value: Money, locale = DEFAULT_LOCALE): string {
  return formatMoney(value, { locale, compact: true, maximumFractionDigits: 1 })
}

export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE
  return new Intl.NumberFormat(locale, buildNumberFormatOptions(options)).format(value)
}

/** Formats a percentage where the input is already in percentage points. */
export function formatPercentage(
  value: number,
  options: FormatPercentageOptions = {},
): string {
  const locale = options.locale ?? DEFAULT_LOCALE
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    ...(options.signDisplay ? { signDisplay: options.signDisplay } : {}),
  })
  return `${formatter.format(value)}%`
}

export function formatQuantity(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(value)
}

export function formatDate(value: DateInput, options: FormatDateOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE
  return new Intl.DateTimeFormat(locale, {
    dateStyle: options.dateStyle ?? 'medium',
    ...(options.timeStyle ? { timeStyle: options.timeStyle } : {}),
  }).format(toDate(value))
}

export function formatDateTime(value: DateInput, options: FormatDateOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE
  return new Intl.DateTimeFormat(locale, {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle ?? 'short',
  }).format(toDate(value))
}

export function formatMonthShort(monthIndex: number, locale = DEFAULT_LOCALE): string {
  const date = new Date(Date.UTC(2024, monthIndex, 1))
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date)
}
