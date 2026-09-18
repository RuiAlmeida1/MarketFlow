export interface HistoricalPricePoint {
  readonly date: string
  readonly close: number
}

/**
 * Daily historical closes used to backfill portfolio performance. Yahoo is used
 * because the configured quote provider (Finnhub free) does not expose candles.
 */
export interface HistoricalPriceProvider {
  getDailyCloses(
    symbol: string,
    fromDate: string,
    toDate: string,
  ): Promise<HistoricalPricePoint[]>
}
