import { describe, expect, it, vi } from 'vitest'
import {
  FinnhubMarketDataProvider,
  type FinnhubInstrument,
} from './finnhub-market-data-provider'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const instrument = (symbol: string): FinnhubInstrument => ({
  symbol,
  name: symbol,
  kind: 'index',
})

describe('FinnhubMarketDataProvider', () => {
  it('maps a Finnhub quote to a MarketQuote', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ c: 100, d: 2, dp: 2.04, pc: 98 }))
    const provider = new FinnhubMarketDataProvider({
      apiKey: 'test-key',
      instruments: [instrument('AAPL')],
      fetcher: fetcher as unknown as typeof fetch,
    })

    const quotes = await provider.getOverview()

    expect(quotes).toEqual([
      {
        symbol: 'AAPL',
        name: 'AAPL',
        kind: 'index',
        value: 100,
        change: 2,
        changePercentage: 2.04,
      },
    ])
  })

  it('sends the API key as a query parameter and encodes the symbol', async () => {
    let capturedUrl = ''
    const fetcher = vi.fn(async (input: string) => {
      capturedUrl = input
      return jsonResponse({ c: 5, d: 0, dp: 0 })
    })
    const provider = new FinnhubMarketDataProvider({
      apiKey: 'secret-token',
      instruments: [instrument('OANDA:EUR_USD')],
      fetcher: fetcher as unknown as typeof fetch,
    })

    await provider.getOverview()

    expect(capturedUrl).toContain('token=secret-token')
    expect(capturedUrl).toContain('symbol=OANDA%3AEUR_USD')
  })

  it('skips symbols that return c=0 (unknown or not entitled)', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ c: 0, d: 0, dp: 0, pc: 1 }))
    const provider = new FinnhubMarketDataProvider({
      apiKey: 'k',
      instruments: [instrument('^GSPC')],
      fetcher: fetcher as unknown as typeof fetch,
    })

    expect(await provider.getOverview()).toEqual([])
  })

  it('does not fail the whole overview when one instrument errors', async () => {
    const fetcher = vi.fn(async (input: string) => {
      if (input.includes('BAD')) return jsonResponse({}, 500)
      return jsonResponse({ c: 10, d: 1, dp: 10, pc: 9 })
    })
    const provider = new FinnhubMarketDataProvider({
      apiKey: 'k',
      instruments: [instrument('BAD'), instrument('GOOD')],
      fetcher: fetcher as unknown as typeof fetch,
    })

    const quotes = await provider.getOverview()

    expect(quotes.map((quote) => quote.symbol)).toEqual(['GOOD'])
  })

  it('rejects an empty API key', () => {
    expect(() => new FinnhubMarketDataProvider({ apiKey: '' })).toThrow()
  })
})
