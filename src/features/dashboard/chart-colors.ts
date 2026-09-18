/** Categorical palette used by allocation and dividend charts. */
export const CHART_COLORS = [
  '#5b9dff',
  '#3ddc97',
  '#a78bfa',
  '#f5b942',
  '#ff7a70',
  '#2dd4bf',
  '#94a3b8',
  '#f472b6',
] as const

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] ?? '#94a3b8'
}
