import type { TooltipPayloadEntry } from './chart-tooltip-types'

export function tooltipNumber(entry: TooltipPayloadEntry | undefined): number {
  if (!entry || typeof entry.value !== 'number') return 0
  return entry.value
}
