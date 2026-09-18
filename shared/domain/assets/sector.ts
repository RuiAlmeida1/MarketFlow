/**
 * Maps a provider industry label (Finnhub `finnhubIndustry`) to a broad sector
 * bucket used by the allocation charts. Falls back to the raw label so a value
 * is never lost, and returns null when there is nothing to work with.
 */
const SECTOR_RULES: readonly [RegExp, string][] = [
  [/real estate|reit/i, 'Real Estate'],
  [/bank|financial|insurance|capital markets|asset management|credit/i, 'Financials'],
  [
    /software|technology|semiconductor|hardware|electronic|computer|information technology|it services/i,
    'Technology',
  ],
  [/pharma|biotech|health|medical|life sciences|drug/i, 'Healthcare'],
  [/utilit/i, 'Utilities'],
  [/energy|oil|gas|coal|petroleum/i, 'Energy'],
  [
    /retail|restaurant|hotel|leisure|beverage|food|tobacco|apparel|textile|automobile|auto |consumer|household|travel/i,
    'Consumer Discretionary',
  ],
  [
    /industrial|machinery|aerospace|defense|transport|logistics|waste|engineering|construction & engineering/i,
    'Industrials',
  ],
  [/chemical|mining|metal|packaging|paper|steel|materials/i, 'Materials'],
  [/telecom|media|entertainment|communication/i, 'Communication Services'],
]

export function sectorFromIndustry(industry: string | null | undefined): string | null {
  if (!industry) return null
  const value = industry.trim()
  if (!value) return null
  const lower = value.toLowerCase()
  for (const [pattern, sector] of SECTOR_RULES) {
    if (pattern.test(lower)) return sector
  }
  return value
}
