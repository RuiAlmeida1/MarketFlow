import { describe, expect, it, vi } from 'vitest'
import type { FxRateWrite } from '../repositories/fx-rate-repository'
import { FxRateRefreshService, type FxRateWriter } from './fx-rate-refresh-service'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('FxRateRefreshService', () => {
  it('stores both directions and skips unsupported currencies', async () => {
    const writes: FxRateWrite[] = []
    const writer: FxRateWriter = {
      upsertRate: vi.fn(async (write) => {
        writes.push(write)
      }),
    }
    const fetcher = vi.fn(async () =>
      jsonResponse({
        base: 'EUR',
        date: '2026-09-18',
        rates: { USD: 1.15, GBP: 0.85, XYZ: 9 },
      }),
    )
    const service = new FxRateRefreshService(
      writer,
      'EUR',
      fetcher as unknown as typeof fetch,
    )

    const result = await service.refresh()

    expect(result.updated).toBe(2)
    expect(writes.find((w) => w.base === 'EUR' && w.quote === 'USD')?.rate).toBeCloseTo(1.15)
    expect(writes.find((w) => w.base === 'USD' && w.quote === 'EUR')?.rate).toBeCloseTo(1 / 1.15)
    expect(writes.every((w) => w.rateDate === '2026-09-18' && w.source === 'frankfurter')).toBe(true)
  })

  it('throws when the provider fails', async () => {
    const writer: FxRateWriter = { upsertRate: vi.fn() }
    const fetcher = vi.fn(async () => jsonResponse({}, 503))
    const service = new FxRateRefreshService(
      writer,
      'EUR',
      fetcher as unknown as typeof fetch,
    )
    await expect(service.refresh()).rejects.toThrow()
  })
})
