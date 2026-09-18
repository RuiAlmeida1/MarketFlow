import type { Money } from '@shared/domain'
import {
  type FormatMoneyOptions,
  type FormatPercentageOptions,
  formatMoney,
  formatPercentage,
} from '@shared/domain/money/format'

export {
  DEFAULT_LOCALE,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMonthShort,
  formatMoney,
  formatNumber,
  formatPercentage,
  formatQuantity,
} from '@shared/domain/money/format'

export type { FormatMoneyOptions, FormatPercentageOptions }

/** Formats money with an explicit sign for non-zero values (`+€1.20`). */
export function formatSignedMoney(
  value: Money,
  options: FormatMoneyOptions = {},
): string {
  return formatMoney(value, { signDisplay: 'exceptZero', ...options })
}

/** Formats a percentage in points with an explicit sign (`+3.54%`). */
export function formatSignedPercentage(
  value: number,
  options: FormatPercentageOptions = {},
): string {
  return formatPercentage(value, { signDisplay: 'exceptZero', ...options })
}

export type ValueTone = 'positive' | 'negative' | 'neutral'

export function valueTone(value: number): ValueTone {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

/** Tailwind text color for a signed financial value. */
export function toneTextClass(tone: ValueTone): string {
  switch (tone) {
    case 'positive':
      return 'text-positive'
    case 'negative':
      return 'text-negative'
    default:
      return 'text-muted'
  }
}

export function toneBackgroundClass(tone: ValueTone): string {
  switch (tone) {
    case 'positive':
      return 'bg-positive-soft text-positive'
    case 'negative':
      return 'bg-negative-soft text-negative'
    default:
      return 'bg-surface-hover text-muted'
  }
}
