/** Minimal structural types for Recharts tooltip payloads (no `any`). */
export interface TooltipPayloadEntry {
  dataKey?: string | number
  name?: string | number
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

export interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: TooltipPayloadEntry[]
}
